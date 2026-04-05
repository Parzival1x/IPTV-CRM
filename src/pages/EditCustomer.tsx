import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  calculateCustomerCredits,
  getCustomerById,
  type Customer,
  updateCustomer,
} from "../data/customersDB";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

type CustomerFormState = Pick<
  Customer,
  | "customerCode"
  | "serviceId"
  | "transactionId"
  | "name"
  | "email"
  | "phone"
  | "whatsappNumber"
  | "address"
  | "city"
  | "country"
  | "status"
  | "role"
  | "mac"
  | "box"
  | "startDate"
  | "paymentDate"
  | "paymentMode"
  | "amount"
  | "expiryDate"
  | "totalCredit"
  | "alreadyGiven"
  | "remainingCredits"
  | "note"
  | "serviceDuration"
>;

const emptyFormState: CustomerFormState = {
  customerCode: "",
  serviceId: "",
  transactionId: "",
  name: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  address: "",
  city: "",
  country: "",
  status: "active",
  role: "",
  mac: "",
  box: "",
  startDate: "",
  paymentDate: "",
  paymentMode: "Cash",
  amount: "",
  expiryDate: "",
  totalCredit: "",
  alreadyGiven: "",
  remainingCredits: "",
  note: "",
  serviceDuration: "12",
};

const internationalPhonePattern = /^\+[1-9]\d{7,14}$/;

const isInternationalPhoneNumber = (value: string) =>
  internationalPhonePattern.test(value.trim());

const parseCurrency = (value: string) =>
  parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;

const normalizeCurrencyInput = (value: string) =>
  value.replace(/[^0-9.]/g, "");

const getStatusTone = (status: Customer["status"]) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "inactive":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const buildFormState = (customer: Customer): CustomerFormState => ({
  customerCode: customer.customerCode || "",
  serviceId: customer.serviceId || "",
  transactionId: customer.transactionId || "",
  name: customer.name || "",
  email: customer.email || "",
  phone: customer.phone || "",
  whatsappNumber: customer.whatsappNumber || "",
  address: customer.address || "",
  city: customer.city || "",
  country: customer.country || "",
  status: customer.status || "active",
  role: customer.role || "",
  mac: customer.mac || "",
  box: customer.box || "",
  startDate: customer.startDate || "",
  paymentDate: customer.paymentDate || "",
  paymentMode: customer.paymentMode || "Cash",
  amount: customer.amount || "",
  expiryDate: customer.expiryDate || "",
  totalCredit: customer.totalCredit || "",
  alreadyGiven: customer.alreadyGiven || "",
  remainingCredits: customer.remainingCredits || "",
  note: customer.note || "",
  serviceDuration: customer.serviceDuration || "12",
});

export default function EditCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormState>(emptyFormState);

  useEffect(() => {
    let isMounted = true;

    const loadCustomer = async () => {
      if (!id) {
        if (isMounted) {
          setNotice({
            type: "error",
            text: "Customer ID is missing from the route.",
          });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setNotice(null);

      try {
        const record = await getCustomerById(id);

        if (!isMounted) {
          return;
        }

        if (!record) {
          setCustomer(null);
          setNotice({
            type: "error",
            text: "The selected customer could not be found.",
          });
          setLoading(false);
          return;
        }

        setCustomer(record);
        setFormData(buildFormState(record));
      } catch (error) {
        if (isMounted) {
          setNotice({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load customer details.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!formData.paymentDate || !formData.serviceDuration || !formData.amount) {
      return;
    }

    const nextCredits = calculateCustomerCredits(
      parseCurrency(formData.amount),
      25,
      formData.paymentDate,
      parseInt(formData.serviceDuration, 10) || 12
    );

    if (
      nextCredits.expiryDate === formData.expiryDate &&
      nextCredits.totalCredit === formData.totalCredit &&
      nextCredits.alreadyGiven === formData.alreadyGiven &&
      nextCredits.remainingCredits === formData.remainingCredits
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      expiryDate: nextCredits.expiryDate,
      totalCredit: nextCredits.totalCredit,
      alreadyGiven: nextCredits.alreadyGiven,
      remainingCredits: nextCredits.remainingCredits,
    }));
  }, [
    formData.amount,
    formData.alreadyGiven,
    formData.expiryDate,
    formData.paymentDate,
    formData.remainingCredits,
    formData.serviceDuration,
    formData.totalCredit,
  ]);

  const metrics = useMemo(
    () => [
      ["Customer code", formData.customerCode || "Generated"],
      ["Service ID", formData.serviceId || "Generated"],
      ["Transaction ID", formData.transactionId || "Generated"],
    ],
    [formData.customerCode, formData.serviceId, formData.transactionId]
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (["amount", "totalCredit", "alreadyGiven", "remainingCredits"].includes(name)) {
      setFormData((current) => ({
        ...current,
        [name]: normalizeCurrencyInput(value),
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!id) {
      setNotice({
        type: "error",
        text: "Customer ID is missing from the route.",
      });
      return;
    }

    if (!isInternationalPhoneNumber(formData.phone)) {
      setNotice({
        type: "error",
        text: "Phone number must use international format, for example +919876543210.",
      });
      return;
    }

    if (
      formData.whatsappNumber &&
      !isInternationalPhoneNumber(formData.whatsappNumber)
    ) {
      setNotice({
        type: "error",
        text: "WhatsApp number must use international format, for example +919876543210.",
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const updatedCustomer = await updateCustomer(id, formData);

      if (!updatedCustomer) {
        throw new Error("The customer could not be updated.");
      }

      navigate(`/customers/${id}`);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save the customer changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h3 className="text-lg font-semibold">Customer unavailable</h3>
        <p className="mt-2 text-sm">
          {notice?.text || "The selected customer could not be loaded."}
        </p>
        <div className="mt-5">
          <Link
            to="/customers"
            className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to customer directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to={`/customers/${customer.id}`}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </Link>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                  formData.status
                )}`}
              >
                {formData.status}
              </span>
            </div>
            <h3 className="mt-4 text-3xl font-semibold text-slate-950">Edit customer</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Update subscriber identity, billing, device, and renewal details from the same
              CRM workflow used by the dashboard and customer directory.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-3xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-xl font-semibold text-slate-950">Customer identity</h4>
              <p className="mt-2 text-sm text-slate-500">
                Keep contact details unique and WhatsApp-ready.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="+919876543210"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    WhatsApp number
                  </label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleInputChange}
                    placeholder="+919876543210"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-xl font-semibold text-slate-950">Subscription and billing</h4>
              <p className="mt-2 text-sm text-slate-500">
                Payment dates and credits stay in sync automatically.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Customer type
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="Premium Customer"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Service duration
                  </label>
                  <select
                    name="serviceDuration"
                    value={formData.serviceDuration}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Payment mode
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="text"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="99.99"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Payment date
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-xl font-semibold text-slate-950">Device and credits</h4>
              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Box ID</label>
                  <input
                    type="text"
                    name="box"
                    value={formData.box}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    MAC address
                  </label>
                  <input
                    type="text"
                    name="mac"
                    value={formData.mac}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Total credit
                  </label>
                  <input
                    type="text"
                    name="totalCredit"
                    value={formData.totalCredit}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Already given
                  </label>
                  <input
                    type="text"
                    name="alreadyGiven"
                    value={formData.alreadyGiven}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Remaining credits
                  </label>
                  <input
                    type="text"
                    name="remainingCredits"
                    value={formData.remainingCredits}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-xl font-semibold text-slate-950">Internal notes</h4>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={10}
                placeholder="Document renewal notes, device issues, payment context, or staff follow-up."
                className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Save the customer record to return to the customer profile view.
          </div>
          <div className="flex gap-3">
            <Link
              to={`/customers/${customer.id}`}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Saving changes..." : "Save customer changes"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
