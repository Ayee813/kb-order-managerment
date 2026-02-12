import { useEffect, useReducer, useState } from "preact/hooks";
import { DEF_PIC_URL, STUFF_STOREKEY } from "../common/constants.ts";
import { _, i18nReady } from "../common/i18n.tsx";
import { Icons } from "../common/icons.tsx";
import { KittyPrinterProps, StuffData, StuffUpdate } from "../common/types.ts";
import Preview from "../components/Preview.tsx";
import StuffWidget from "../components/StuffWidget.tsx";

function timestamp() {
    return new Date().getTime();
}

function properStuff(stuff: StuffData) {
    stuff.offset = stuff.offset || 0;
    switch (stuff.type) {
        case 'text':
            stuff = Object.assign({
                dither: 'text',
                rotate: 0,
                flipH: false,
                flipV: false,
                brightness: 128,
                textContent: '',
                textAlign: 'start',
                textFontFamily: 'sans-serif',
                textFontSize: 16,
                textLineSpacing: (stuff.textFontSize || 16) / 2 | 0,
                textFontWeight: '',
                textShift: 0
            }, stuff);
            break;
        case 'pic':
            stuff = Object.assign({
                dither: 'steinberg',
                rotate: 0,
                flipH: false,
                flipV: false,
                brightness: 128,
                picUrl: DEF_PIC_URL,
                picFlipH: false,
                picFlipV: false
            }, stuff);
            break;
    }
    return stuff;
}

export default function KittyPrinter(props: KittyPrinterProps) {
    let stuff_store: StuffData[] = [];
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const orderId = urlParams?.get('orderId');

    if (!orderId) {
        try {
            //@ts-expect-error: many would go wrong, just reset in case
            stuff_store = JSON.parse(localStorage.getItem(STUFF_STOREKEY)).map(s => properStuff(s));
            if (stuff_store.length === 0) throw new Error();
        } catch (_error) {
            stuff_store = [];
            if (typeof localStorage === 'object') // unavailable in deno deploy
                localStorage.setItem(STUFF_STOREKEY, JSON.stringify(stuff_store));
        }
    }

    const [stuffs, dispatch] = useReducer<StuffData[], StuffUpdate>((data, update) => {
        const stuff = update.stuff;
        const index = stuffs.indexOf(stuff);
        switch (update.action) {
            case 'add':
                if (index === -1)
                    data.push(stuff);
                else
                    data.splice(index, 0, stuff);
                break;
            default:
                switch (update.action) {
                    case 'modify':
                        break;
                    case 'remove':
                        stuff.type = 'void';
                        break;
                    case 'moveup':
                        if (index === 0) {
                            break;
                        } else if (index === -1) {
                            stuffs.unshift(stuff);
                        } else {
                            stuffs.splice(index, 1);
                            stuffs.splice(index - 1, 0, stuff);
                        }
                        break;
                    case 'movedown':
                        if (index === stuffs.length - 1) {
                            break;
                        } else if (index === -1) {
                            stuffs.push(stuff);
                        } else {
                            stuffs.splice(index, 1);
                            stuffs.splice(index + 1, 0, stuff);
                        }
                        break;
                }
                break;
        }
        let newid = 0;
        data = data.filter(s => s.type !== 'void').map(s => (s.id = newid++, s)).map(s => properStuff(s));
        localStorage.setItem(STUFF_STOREKEY, JSON.stringify(data));
        return data;
    }, stuff_store);

    useEffect(() => {
        if (stuffs.length === 0)
            i18nReady(() => {
                let initialText = _('welcome').value;
                let textAlign: 'center' | 'start' = 'center';

                if (orderId) {
                    try {
                        const ordersStr = localStorage.getItem('orders');
                        if (ordersStr) {
                            const orders = JSON.parse(ordersStr);
                            const order = orders.find((o: any) => o.Order_ID === orderId);
                            if (order) {
                                initialText = `---------------------\nຟາກ : Bai garden\nເບີ : 99836715\nຮັບ : ${order.Customer_Name}\nເບີ : ${order.Phone_Number || ''}\nສາຂາ : ${order.Branch}\nCOD : ${order.COD}\n---------------------`;
                                textAlign = 'start';
                            }
                        }
                    } catch (e) {
                        console.error("Failed to load order for printing", e);
                    }
                }

                const initials: StuffData[] = [
                    { type: 'text', id: 0, textContent: initialText, textAlign: textAlign, textFontSize: 24 }
                ];

                // Only add default picture if NOT printing a specific order
                if (!orderId) {
                    initials.push({ type: 'pic', id: 1, picUrl: DEF_PIC_URL });
                }

                initials.map(stuff => properStuff(stuff)).forEach(stuff => {
                    dispatch({ action: 'add', stuff: stuff });
                });
            });
    });

    useEffect(() => {
        document.addEventListener('paste', () => {
            if (document.activeElement.type !== "textarea") {
                dispatch({
                    action: 'add',
                    stuff: { type: 'text', id: 0, triggerPaste: true }
                });
            }

        })
    }, []);
    const comp = <div class="kitty-container">
        <div class="kitty-canvas">
            {stuffs.map(stuff => StuffWidget({ dispatch, stuff }))}
            <button class="stuff stuff--button" aria-label={_('add')} onClick={() => {
                dispatch({
                    action: 'add',
                    stuff: { type: 'text', id: 0 }
                });
            }} data-key=" ">
                <Icons.IconPlus size={36} />
            </button>
        </div>
        <div>
            <Preview stuffs={stuffs} />
        </div>
    </div>;
    return comp;
}
