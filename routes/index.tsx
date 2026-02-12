import { Head } from "$fresh/runtime.ts";
import { _ } from "../common/i18n.tsx";
import Nav from "../islands/Nav.tsx";
import Dashboard from "../islands/Dashboard.tsx";

export { handler } from "../common/i18n.tsx";

export default function Home(request: Request) {
    return <>
        <Head>
            <title>{_('dashboard')} - {_('kitty-printer')}</title>
        </Head>
        <Nav url={request.url} />
        <div class="kitty-container">
            <Dashboard />
        </div>
    </>;
}
