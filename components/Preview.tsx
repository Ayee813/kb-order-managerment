import { createRef } from "preact";
import { CAT_ADV_SRV, CAT_PRINT_RX_CHAR, CAT_PRINT_SRV, CAT_PRINT_TX_CHAR, DEF_CANVAS_WIDTH, DEF_ENERGY, DEF_FINISH_FEED, DEF_SPEED, STUFF_PAINT_INIT_URL } from "../common/constants.ts";
import { BitmapData, PrinterProps, StuffData } from "../common/types.ts";
import StuffPreview from "./StuffPreview.tsx";
import { useMemo, useReducer, useState } from "preact/hooks";
import type { Dispatch } from "preact/hooks";
import { Icons } from "../common/icons.tsx";
import { _ } from "../common/i18n.tsx";
import { CatPrinter } from "../common/cat-protocol.ts";
import { delay } from "$std/async/delay.ts";
import Settings from "./Settings.tsx";

declare let navigator: Navigator & {
    // deno-lint-ignore no-explicit-any
    bluetooth: any;
};

function _arrayEqual<T extends ArrayLike<number | string>>(a: T, b: T) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i)
        if (a[i] !== b[i])
            return false;
    return true;
}

function rgbaToBits(data: Uint32Array) {
    const length = data.length / 8 | 0;
    const result = new Uint8Array(length);
    for (let i = 0, p = 0; i < data.length; ++p) {
        result[p] = 0;
        for (let d = 0; d < 8; ++i, ++d)
            result[p] |= data[i] & 0xff & (0b1 << d);
        result[p] ^= 0b11111111;
    }
    return result;
}

function capturePreviewAsBlob(stuffs: StuffData[], bitmap_data: Record<number, BitmapData>): Promise<Blob> {
    const totalHeight = stuffs.reduce((acc, s) => acc + (s.height || 0) + Math.abs(s.offset || 0), 0);
    const canvas = document.createElement('canvas');
    canvas.width = DEF_CANVAS_WIDTH;
    canvas.height = Math.max(totalHeight, 1);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    for (const stuff of stuffs) {
        y += Math.max(stuff.offset || 0, 0);
        const data = bitmap_data[stuff.id];
        if (data) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = data.width;
            tempCanvas.height = data.height;
            const tempCtx = tempCanvas.getContext('2d')!;
            const imageData = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
            tempCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(tempCanvas, 0, y);
            y += data.height;
        }
    }

    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
}

const MemoizedStuffItem = ({ stuff, index, dispatch }: { stuff: StuffData, index: number, dispatch: Dispatch<BitmapData> }) => {
    return useMemo(() =>
        <StuffPreview stuff={stuff} index={index} dispatch={dispatch} width={DEF_CANVAS_WIDTH} />
        , [JSON.stringify(stuff)]);
};

export default function Preview(props: PrinterProps) {
    const [bitmap_data, dispatch] = useReducer<Record<number, BitmapData>, BitmapData>((data, update) => {
        data[update.index] = update;
        return data;
    }, {});

    const [settingsVisible, setSettingsVisible] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const stuffs = props.stuffs;
    if (stuffs.length === 0)
        return <div class="kitty-preview">
            <img src={STUFF_PAINT_INIT_URL} width={DEF_CANVAS_WIDTH} height={1} />
        </div>;
    const preview_ref = createRef();
    const preview = <div ref={preview_ref} class="kitty-preview">
        {stuffs.map((stuff, index) =>
            <MemoizedStuffItem key={stuff.id} stuff={stuff} index={index} dispatch={dispatch} />
        )}
    </div>;

    const print = async () => {
        setIsPrinting(true);
        const speed = +(localStorage.getItem("speed") || DEF_SPEED);
        const energy = +(localStorage.getItem("energy") || DEF_ENERGY);
        const finish_feed = +(localStorage.getItem("finishFeed") || DEF_FINISH_FEED);

        let device, server;
        try {
            // 1. Fetch latest data and Archive to Google Drive
            const blob = await capturePreviewAsBlob(stuffs, bitmap_data);
            const formData = new FormData();
            formData.append('file', blob, 'print-job.png');

            const googleRes = await fetch('/api/google', {
                method: 'POST',
                body: formData
            }).then(r => r.json());

            if (googleRes.data) {
                console.log("Latest Sheets Data:", googleRes.data);
            }

            // 2. Bluetooth Print Flow
            device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [CAT_ADV_SRV] }],
                optionalServices: [CAT_PRINT_SRV]
            });
            server = await device.gatt.connect();
            const service = await server.getPrimaryService(CAT_PRINT_SRV);
            const [tx, rx] = await Promise.all([
                service.getCharacteristic(CAT_PRINT_TX_CHAR),
                service.getCharacteristic(CAT_PRINT_RX_CHAR)
            ]);
            const printer = new CatPrinter(
                device.name,
                tx.writeValueWithoutResponse.bind(tx),
                false
            );
            const notifier = (event: Event) => {
                //@ts-ignore:
                const data: DataView = event.target.value;
                const message = new Uint8Array(data.buffer);
                printer.notify(message);
            };

            let blank = 0;

            await rx.startNotifications()
                .then(() => rx.addEventListener('characteristicvaluechanged', notifier))
                .catch((error: Error) => console.log(error));

            await printer.prepare(speed, energy);
            for (const stuff of stuffs) {
                if (stuff.offset) {
                    await printer.setSpeed(8);
                    if (stuff.offset > 0)
                        await printer.feed(stuff.offset);
                    else
                        await printer.retract(-stuff.offset);
                    await printer.setSpeed(speed);
                }
                const data = bitmap_data[stuff.id];
                const bitmap = rgbaToBits(new Uint32Array(data.data.buffer));
                const pitch = data.width / 8 | 0;
                for (let i = 0; i < data.height * pitch; i += pitch) {
                    const line = bitmap.slice(i, i + pitch);
                    if (line.every(byte => byte === 0)) {
                        blank += 1;
                    } else {
                        if (blank > 0) {
                            await printer.setSpeed(8);
                            await printer.feed(blank);
                            await printer.setSpeed(speed);
                            blank = 0;
                        }
                        await printer.draw(line);
                    }
                }
            }

            await printer.finish(blank + finish_feed);
            await rx.stopNotifications().then(() => rx.removeEventListener('characteristicvaluechanged', notifier));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Print failed:", message); // Changed "Google Sheets Fetch Error" to "Print failed" to match original context
            // The original snippet had `return new Response(...)` which is not valid in this context.
            // Assuming the intent was to log the error safely and then proceed to finally block.
            // If an early exit was intended, a `return;` could be added here.
        } finally {
            await delay(500);
            if (server) server.disconnect();
            setIsPrinting(false); // Changed from setIsPrinting(true) then setIsPrinting(false) to just setIsPrinting(false)
        }
    };

    const print_menu = <div>
        <div class="print-menu">
            <button class="stuff stuff--button" type="button" style={{ width: "80%" }} aria-label={_('print')}
                onClick={isPrinting ? undefined : print} data-key="Enter" disabled={isPrinting}>
                {isPrinting ? <Icons.IconRotateClockwise class="animate-spin" /> : <Icons.IconPrinter />}
            </button>
            <button class="stuff stuff--button" type="button" style={{ width: "20%" }} aria-label={_('settings')} onClick={() => setSettingsVisible(!settingsVisible)} data-key="\">
                <Icons.IconSettings />
            </button>
        </div>
        <Settings visible={settingsVisible} />
    </div>;

    return <>
        {preview}
        {print_menu}
    </>;
}
