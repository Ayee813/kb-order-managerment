import { useEffect, useState } from "preact/hooks";
import { _ } from "../common/i18n.tsx";
import { Icons } from "../common/icons.tsx";
import { HAL_BRANCH } from "../constants/HalBranch.ts";
import { AnousithBranch } from "../constants/AnousithBranch.ts";

interface Order {
    Order_ID: string;
    Customer_Name: string;
    Phone_Number: string;
    Product: string;
    Price: string;
    Qty: string;
    COD: string;
    Logistic: string;
    Branch: string;
    Status: string;
    Image_Link: string;
    rowIndex: number; // For updates/deletes
}

const HEADERS = [
    "Order_ID",
    "Customer_Name",
    "Phone_Number",
    "Product",
    "Price",
    "Qty",
    "COD",
    "Logistic",
    "Branch",
    "Status",
    "Image_Link",
];

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [branchSearch, setBranchSearch] = useState("");
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/google?action=list").then((r) => r.json());
            if (res.error) throw new Error(res.error);

            const rows = res.data as string[][];
            if (rows.length === 0) {
                setOrders([]);
                return;
            }

            // Skip header row (index 0)
            const dataRows = rows.slice(1).map((row, idx) => {
                const order: any = { rowIndex: idx + 1 };
                HEADERS.forEach((header, i) => {
                    order[header] = row[i] || "";
                });
                return order as Order;
            });
            setOrders(dataRows);
            // Save orders to localStorage for bill printing access
            localStorage.setItem('orders', JSON.stringify(dataRows));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleSave = async (e: Event) => {
        e.preventDefault();
        if (!editingOrder) return;

        setLoading(true);
        try {
            const values = HEADERS.map((h) => (editingOrder as any)[h] || "");
            const formData = new FormData();
            formData.set("values", JSON.stringify([values]));
            if (selectedImage) {
                formData.set("image", selectedImage);
            }

            if (editingOrder.rowIndex !== undefined) {
                // Update
                const range = `Sheet1!A${editingOrder.rowIndex + 1}:Z${editingOrder.rowIndex + 1}`;
                formData.set("range", range);
                const res = await fetch("/api/google", {
                    method: "PUT",
                    body: formData,
                }).then((r) => r.json());
                if (res.error) throw new Error(res.error);
            } else {
                // Create
                const res = await fetch("/api/google?action=create", {
                    method: "POST",
                    body: formData,
                }).then((r) => r.json());
                if (res.error) throw new Error(res.error);
            }
            setEditingOrder(null);
            setSelectedImage(null);
            fetchOrders();
        } catch (e) {
            alert((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (rowIndex: number) => {
        if (!confirm("Are you sure you want to delete this order?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/google?rowIndex=${rowIndex}`, {
                method: "DELETE",
            }).then((r) => r.json());
            if (res.error) throw new Error(res.error);
            fetchOrders();
        } catch (e) {
            alert((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("complete") || s.includes("delivered") || s.includes("done")) return "badge-success";
        if (s.includes("pending") || s.includes("process")) return "badge-warning";
        if (s.includes("cancel") || s.includes("fail")) return "badge-danger";
        return "badge-default";
    };

    // Format number with comma separators
    const formatNumber = (value: string | number): string => {
        if (!value) return "";
        const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
        if (isNaN(num)) return "";
        return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };

    // Generate next Order_ID based on existing orders
    const generateNextOrderId = () => {
        if (orders.length === 0) return "1";

        // Extract numeric IDs from existing orders
        const numericIds = orders
            .map(o => parseInt(o.Order_ID))
            .filter(id => !isNaN(id));

        if (numericIds.length === 0) return "1";

        // Find the maximum ID and add 1
        const maxId = Math.max(...numericIds);
        return (maxId + 1).toString();
    };

    // Get branch options based on selected logistic
    const getBranchOptions = (logistic: string) => {
        if (logistic === "HAL Logistic") {
            return HAL_BRANCH.map(branch => ({
                value: `${branch.location.village.name_lao}, ${branch.location.district.name_lao}, ${branch.location.province.name_lao}`,
                label: `${branch.location.district.name_lao} - ${branch.name.lao}`
            }));
        } else if (logistic === "ANUSIT") {
            return AnousithBranch.map(branch => ({
                value: `${branch.branch_address}, ${branch.districtName}, ${branch.provinceID.provinceName}`,
                label: `${branch.districtName} - ${branch.branch_name}`
            }));
        }
        return [];
    };

    return (
        <div class="kitty-canvas orders-page-container">
            <div class="orders-header">
                <h3 class="orders-title">Order Management</h3>
                <button
                    class="btn btn-primary"
                    onClick={() => {
                        const nextOrderId = generateNextOrderId();
                        setEditingOrder({
                            Order_ID: nextOrderId,
                            Customer_Name: "ລູກຄ້າ"
                        });
                        setSelectedImage(null);
                        setBranchSearch("");
                        setShowBranchDropdown(false);
                    }}
                >
                    <Icons.IconPlus size={18} /> New
                </button>
            </div>

            {error && (
                <div class="error-banner">
                    {error}
                </div>
            )}

            <div class="modern-table-container">
                {loading && !orders.length ? (
                    <div class="loading-state">
                        <Icons.IconLoader2 class="icon-spin" size={24} />
                        <p>Loading orders...</p>
                    </div>
                ) : (
                    <div class="table-scroll-container">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    {HEADERS.map((h) => <th>{h.replace(/_/g, " ")}</th>)}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o) => (
                                    <tr key={o.rowIndex}>
                                        {HEADERS.map((h) => (
                                            <td data-label={h.replace(/_/g, " ")}>
                                                {h === "Image_Link" && o[h] ? (
                                                    <a href={o[h]} target="_blank" class="btn btn-ghost view-image-btn">
                                                        <Icons.IconPhoto size={16} /> View
                                                    </a>
                                                ) : h === "Status" ? (
                                                    <span class={`badge ${getStatusBadgeClass(o[h])}`}>{o[h]}</span>
                                                ) : h === "COD" || h === "Price" ? (
                                                    formatNumber((o as any)[h])
                                                ) : (
                                                    (o as any)[h]
                                                )}
                                            </td>
                                        ))}
                                        <td data-label="Actions">
                                            <div class="action-buttons">
                                                <a
                                                    href={`/bill-printing?orderId=${o.Order_ID}`}
                                                    class="btn btn-ghost action-btn"
                                                    title="Print Bill"
                                                >
                                                    <Icons.IconPrinter size={18} />
                                                </a>
                                                <button
                                                    class="btn btn-ghost action-btn"
                                                    onClick={() => {
                                                        setEditingOrder(o);
                                                        setBranchSearch(o.Branch);
                                                        setSelectedImage(null);
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Icons.IconEdit size={18} />
                                                </button>
                                                <button
                                                    class="btn btn-ghost action-btn delete-btn"
                                                    onClick={() => handleDelete(o.rowIndex)}
                                                    title="Delete"
                                                >
                                                    <Icons.IconTrash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={HEADERS.length + 1} class="empty-state">
                                            No orders found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editingOrder && (
                <div class="modal-overlay" onClick={() => {
                    setEditingOrder(null);
                    setBranchSearch("");
                    setShowBranchDropdown(false);
                }}>
                    <div class="modal-content orders-modal" onClick={(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h4 class="modal-title">{editingOrder.rowIndex !== undefined ? "Edit Order" : "New Order"}</h4>
                            <button class="btn btn-ghost close-btn" onClick={() => {
                                setEditingOrder(null);
                                setBranchSearch("");
                                setShowBranchDropdown(false);
                            }}>
                                <Icons.IconX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div class="form-grid">
                                {HEADERS.map((h) => {
                                    if (h === "Image_Link") {
                                        return (
                                            <div class="form-group">
                                                <label class="form-label">Upload Image</label>
                                                <div class="upload-container">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="file-upload"
                                                        style={{ display: "none" }}
                                                        onChange={(e) => setSelectedImage((e.target as HTMLInputElement).files?.[0] || null)}
                                                    />
                                                    <label htmlFor="file-upload" class="btn btn-ghost file-label">
                                                        <Icons.IconPhotoPlus size={20} />
                                                        {selectedImage ? selectedImage.name : "Choose an image"}
                                                    </label>
                                                    {editingOrder[h] && !selectedImage && (
                                                        <p class="current-image-hint">
                                                            Current: <a href={editingOrder[h]} target="_blank">View Image</a>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Skip Order_ID field - it will be auto-generated
                                    if (h === "Order_ID") {
                                        return null;
                                    }

                                    // Special handling for Logistic field - use select dropdown
                                    if (h === "Logistic") {
                                        return (
                                            <div class="form-group">
                                                <label class="form-label">{h.replace(/_/g, " ")}</label>
                                                <select
                                                    class="form-input pointer"
                                                    value={(editingOrder as any)[h] || ""}
                                                    onChange={(e) => {
                                                        const newLogistic = (e.target as HTMLSelectElement).value;
                                                        setEditingOrder({ ...editingOrder, [h]: newLogistic, Branch: "" });
                                                        setBranchSearch("");
                                                    }}
                                                    required
                                                >
                                                    <option value="">Select Logistic</option>
                                                    <option value="HAL Logistic">HAL Logistic</option>
                                                    <option value="ANUSIT">ANUSIT</option>
                                                </select>
                                            </div>
                                        );
                                    }

                                    // Special handling for Branch field - show dropdown if logistic is selected
                                    if (h === "Branch") {
                                        const selectedLogistic = (editingOrder as any)["Logistic"] || "";
                                        const branchOptions = getBranchOptions(selectedLogistic);

                                        if (branchOptions.length > 0) {
                                            // Filter branches based on search
                                            const filteredBranches = branchOptions.filter(option =>
                                                option.label.toLowerCase().includes(branchSearch.toLowerCase())
                                            );

                                            return (
                                                <div class="form-group relative">
                                                    <label class="form-label">{h.replace(/_/g, " ")}</label>
                                                    <input
                                                        class="form-input"
                                                        value={branchSearch !== "" ? branchSearch : ((editingOrder as any)[h] || "")}
                                                        onInput={(e) => {
                                                            const value = (e.target as HTMLInputElement).value;
                                                            setBranchSearch(value);
                                                            setEditingOrder({ ...editingOrder, [h]: value });
                                                            setShowBranchDropdown(true);
                                                        }}
                                                        onFocus={() => {
                                                            // If field has value, set it to search so we can edit it
                                                            if ((editingOrder as any)[h] && branchSearch === "") {
                                                                setBranchSearch((editingOrder as any)[h]);
                                                            }
                                                            setShowBranchDropdown(true);
                                                        }}
                                                        placeholder="Type to search branches..."
                                                        autoComplete="off"
                                                    />
                                                    {showBranchDropdown && filteredBranches.length > 0 && (
                                                        <div class="branch-dropdown">
                                                            {filteredBranches.map((option) => (
                                                                <div
                                                                    key={option.value}
                                                                    onClick={() => {
                                                                        setEditingOrder({
                                                                            ...editingOrder,
                                                                            [h]: option.value
                                                                        });
                                                                        setBranchSearch(option.value);
                                                                        setShowBranchDropdown(false);
                                                                    }}
                                                                    class="branch-option"
                                                                >
                                                                    {option.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // If no logistic selected, show regular input
                                        return (
                                            <div class="form-group">
                                                <label class="form-label">{h.replace(/_/g, " ")}</label>
                                                <input
                                                    class="form-input"
                                                    value={(editingOrder as any)[h] || ""}
                                                    onInput={(e) => setEditingOrder({ ...editingOrder, [h]: (e.target as HTMLInputElement).value })}
                                                    placeholder={`Enter ${h.replace(/_/g, " ").toLowerCase()}`}
                                                />
                                            </div>
                                        );
                                    }

                                    // Special handling for Status field - use select dropdown
                                    if (h === "Status") {
                                        return (
                                            <div class="form-group">
                                                <label class="form-label">{h.replace(/_/g, " ")}</label>
                                                <select
                                                    class="form-input pointer"
                                                    value={(editingOrder as any)[h] || ""}
                                                    onChange={(e) => setEditingOrder({ ...editingOrder, [h]: (e.target as HTMLSelectElement).value })}
                                                    required
                                                >
                                                    <option value="">Select Status</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="COMPLETE">COMPLETE</option>
                                                </select>
                                            </div>
                                        );
                                    }

                                    // Special handling for COD field - use formatted number input
                                    if (h === "COD" || h === "Price") {
                                        return (
                                            <div class="form-group">
                                                <label class="form-label">{h.replace(/_/g, " ")}</label>
                                                <input
                                                    type="text"
                                                    class="form-input"
                                                    value={formatNumber((editingOrder as any)[h] || "")}
                                                    onInput={(e) => {
                                                        const value = (e.target as HTMLInputElement).value;
                                                        // Remove commas and store the raw number
                                                        const rawValue = value.replace(/,/g, "");
                                                        setEditingOrder({ ...editingOrder, [h]: rawValue });
                                                    }}
                                                    onBlur={(e) => {
                                                        // Format on blur
                                                        const value = (e.target as HTMLInputElement).value;
                                                        const rawValue = value.replace(/,/g, "");
                                                        if (rawValue && !isNaN(parseFloat(rawValue))) {
                                                            setEditingOrder({ ...editingOrder, [h]: rawValue });
                                                        }
                                                    }}
                                                    placeholder={`Enter ${h} amount`}
                                                    inputMode="numeric"
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div class="form-group">
                                            <label class="form-label">{h.replace(/_/g, " ")}</label>
                                            <input
                                                class="form-input"
                                                value={(editingOrder as any)[h] || ""}
                                                onInput={(e) => setEditingOrder({ ...editingOrder, [h]: (e.target as HTMLInputElement).value })}
                                                placeholder={`Enter ${h.replace(/_/g, " ").toLowerCase()}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="btn btn-ghost" onClick={() => { setEditingOrder(null); setSelectedImage(null); }}>
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary save-btn" disabled={loading}>
                                    {loading ? <Icons.IconLoader2 class="icon-spin" size={18} /> : "Save"}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}

            <style jsx>{`
                .orders-page-container {
                    padding: 1.5rem;
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .orders-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .orders-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-color);
                }
                
                .error-banner {
                    padding: 1rem;
                    background: #fee2e2;
                    color: #b91c1c;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }
                
                .loading-state {
                    padding: 3rem;
                    text-align: center;
                    color: var(--gray-2);
                }
                
                .table-scroll-container {
                    overflow-x: auto;
                    width: 100%;
                }
                
                .view-image-btn {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .action-btn {
                    padding: 0.4rem;
                }
                
                .delete-btn {
                    color: #ff5252;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: var(--gray-2);
                }
                
                /* Modal Styles */
                .orders-modal {
                    max-width: 1200px;
                    width: 95%;
                }
                
                .close-btn {
                    padding: 0.25rem;
                }
                
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                
                .upload-container {
                    border: 1px dashed var(--gray-1);
                    padding: 1rem;
                    border-radius: 6px;
                    text-align: center;
                }
                
                .file-label {
                    cursor: pointer;
                    width: 100%;
                }
                
                .current-image-hint {
                    font-size: 0.75rem;
                    marginTop: 0.5rem;
                    color: var(--gray-2);
                }
                
                .current-image-hint a {
                    text-decoration: underline;
                }
                
                .pointer {
                    cursor: pointer;
                }
                
                .relative {
                    position: relative;
                }
                
                .branch-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    max-height: 200px;
                    overflow-y: auto;
                    background: var(--surface-color);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    margin-top: 4px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                }
                
                .branch-option {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    border-bottom: 1px solid var(--border-color);
                    transition: background 0.15s ease;
                }
                
                .branch-option:hover {
                    background: var(--secondary-color);
                }
                
                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    justify-content: flex-end;
                }
                
                .save-btn {
                    min-width: 100px;
                }

                .form-group {
                    width: 100%;
                }

                .form-input {
                    width: 100% !important;
                    box-sizing: border-box;
                }

                @media (max-width: 1024px) {
                    .modern-table-container {
                        background: none;
                        border: none;
                        box-shadow: none;
                        overflow: visible;
                    }
                    
                    .modern-table thead {
                        display: none;
                    }
                    
                    .modern-table, .modern-table tbody, .modern-table tr, .modern-table td {
                        display: block;
                        width: 100%;
                    }
                    
                    .modern-table tr {
                        margin-bottom: 1rem;
                        background: var(--surface-color);
                        border-radius: 12px;
                        border: 1px solid var(--border-color);
                        padding: 1rem;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .modern-table td {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.75rem 0;
                        border-bottom: 1px solid var(--border-color);
                        text-align: right;
                        white-space: normal;
                    }
                    
                    .modern-table td:last-child {
                        border-bottom: none;
                        padding-top: 1rem;
                        justify-content: center;
                    }
                    
                    .modern-table td::before {
                        content: attr(data-label);
                        float: left;
                        font-weight: 600;
                        color: var(--text-primary);
                        font-size: 0.85rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    
                    .action-buttons {
                        justify-content: center;
                        width: 100%;
                    }
                    
                    .orders-modal {
                        width: 98%;
                        padding: 1rem;
                    }
                    
                    .form-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }
                
                @media (max-width: 640px) {
                    .orders-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .btn-primary {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
