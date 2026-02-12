import { Head } from "$fresh/runtime.ts";
import KittyPrinter from "../islands/KittyPrinter.tsx";
import { _ } from "../common/i18n.tsx";
import Nav from "../islands/Nav.tsx";
import DynamicManifest from "../islands/DynamicManifest.tsx";

export { handler } from "../common/i18n.tsx";

export default function BillPrinting(request: Request) {
    return <>
        <Head>
            <title>{_('bill-printing')} - {_('kitty-printer')}</title>
        </Head>
        <DynamicManifest />
        <Nav url={request.url} />
        <KittyPrinter />
    </>;
}
