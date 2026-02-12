import { Head } from "$fresh/runtime.ts";
import { _ } from "../common/i18n.tsx";
import Nav from "../islands/Nav.tsx";
import OrderManagement from "../islands/OrderManagement.tsx";

export { handler } from "../common/i18n.tsx";

export default function Orders(request: Request) {
    return <>
        <Head>
            <title>{_('order-management')} - {_('kitty-printer')}</title>
        </Head>
        <Nav url={request.url} />
        <div class="kitty-container">
            <OrderManagement />
        </div>
    </>;
}