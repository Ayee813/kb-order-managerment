import { useEffect, useState } from "preact/hooks";
import { _ } from "../common/i18n.tsx";
import { Icons } from "../common/icons.tsx";

// Simplified Order interface for Dashboard
interface Order {
    Order_ID: string;
    Customer_Name: string;
    Product: string;
    Price: string;
    Qty: string;
    Status: string;
    // We only need a subset for the dashboard
}

export default function Dashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/google?action=list").then((r) => r.json());
                if (res.data) {
                    const rows = res.data as string[][];
                    // Skip header
                    const dataRows = rows.slice(1);

                    let revenue = 0;
                    let pending = 0;
                    const parsedOrders: Order[] = [];

                    dataRows.forEach(row => {
                        // Headers indices based on known structure:
                        // 0:ID, 1:Name, 3:Product, 4:Price, 5:Qty, 9:Status
                        const price = parseFloat(row[4]?.replace(/[^0-9.-]+/g, "") || "0");
                        const qty = parseFloat(row[5]?.replace(/[^0-9.-]+/g, "") || "0");
                        const status = row[9] || "";

                        revenue += price * qty;
                        if (status.toUpperCase().includes("PENDING") || status.toLowerCase().includes("process")) {
                            pending++;
                        }

                        parsedOrders.push({
                            Order_ID: row[0],
                            Customer_Name: row[1],
                            Product: row[3],
                            Price: row[4],
                            Qty: row[5],
                            Status: status,
                        });
                    });

                    setStats({
                        totalRevenue: revenue,
                        totalOrders: dataRows.length,
                        pendingOrders: pending,
                    });

                    // Keep only recent 5 orders, reversed
                    setOrders(parsedOrders.reverse().slice(0, 5));
                }
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        // Adjust currency locale if needed, assuming USD/Generic for now based on context
    };

    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase();
        let cls = "badge-default";
        if (s.includes("COMPLETE") || s.includes("DELIVERED") || s.includes("DONE")) cls = "badge-success";
        else if (s.includes("PENDING") || s.includes("PROCESS")) cls = "badge-warning";
        else if (s.includes("CANCEL") || s.includes("FAIL")) cls = "badge-danger";

        return <span class={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div class="kitty-canvas" style={{ padding: "2rem", width: "100%", maxWidth: "1200px" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Hello, Owner! 👋</h2>
                <p style={{ color: "var(--gray-2)" }}>Here is what's happening in your store today.</p>
            </div>

            {/* Quick Actions */}
            <div class="quick-actions">
                <a href="/orders" class="btn btn-primary" style={{ padding: "0.75rem 1.5rem", fontSize: "1rem", color: "var(--background-color)" }}>
                    <Icons.IconPlus /> New Order
                </a>
                <a href="/bill-printing" class="btn btn-ghost" style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}>
                    <Icons.IconPrinter /> Print Bills
                </a>
            </div>

            {/* KPI Grid */}
            <div class="dashboard-grid">
                <div class="card">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ padding: "12px", background: "#e0f2fe", borderRadius: "8px", color: "#0284c7" }}>
                            <Icons.IconClipboardPlus size={24} />
                        </div>
                        <div>
                            <div class="stat-label">Total Orders</div>
                            <div class="stat-value">{loading ? "-" : stats.totalOrders}</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ padding: "12px", background: "#fff7ed", borderRadius: "8px", color: "#ea580c" }}>
                            <Icons.IconLoader2 size={24} />
                        </div>
                        <div>
                            <div class="stat-label">Pending</div>
                            <div class="stat-value">{loading ? "-" : stats.pendingOrders}</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ padding: "12px", background: "#ecfccb", borderRadius: "8px", color: "#65a30d" }}>
                            {/* Using TextIncrease as a proxy for 'Growth/Money' if no dollar icon available */}
                            <Icons.IconTextIncrease size={24} />
                        </div>
                        <div>
                            <div class="stat-label">Est. Revenue</div>
                            <div class="stat-value">{loading ? "-" : formatCurrency(stats.totalRevenue)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Recent Activity</h3>
                    <a href="/orders" style={{ color: "var(--primary-color)", textDecoration: "none", fontWeight: "500" }}>View All</a>
                </div>

                <div class="modern-table-container" style={{ marginTop: 0 }}>
                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center" }}>Loading recent activity...</div>
                    ) : (
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? orders.map(o => (
                                    <tr key={o.Order_ID}>
                                        <td>{o.Order_ID}</td>
                                        <td>{o.Customer_Name}</td>
                                        <td>{o.Product}</td>
                                        <td>{o.Price}</td>
                                        <td>{getStatusBadge(o.Status)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>No recent orders.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
