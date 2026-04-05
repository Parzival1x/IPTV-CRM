import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCustomer, type CustomerServiceInput } from "../data/customersDB";

type Notice = { type: "success" | "error"; text: string } | null;
type Template = { id: string; name: string; category: string; price: number; sku: string; features: string[]; portalUrlTemplate: string; billingUrlTemplate: string; defaultDuration: string; requiresBox: boolean; requiresMac: boolean };
type ServiceDraft = { id: string; templateId: string; startDate: string; paymentDate: string; paymentMode: string; amount: string; duration: string; box: string; mac: string };
type FormState = { customerName: string; customerPhone: string; customerWhatsapp: string; customerEmail: string; customerAddress: string; customerCity: string; customerCountry: string; customerNotes: string; customerCode: string; serviceId: string; transactionId: string };

const templates: Template[] = [
  { id: "INT-PRE-001", name: "Premium Internet Package", category: "Internet", price: 50, sku: "INT-PRE-001", features: ["Up to 500 Mbps", "Unlimited Data", "Priority Support"], portalUrlTemplate: "https://premium.internet.example.com/customer/{customerId}", billingUrlTemplate: "https://billing.premium.internet.example.com/customer/{customerId}", defaultDuration: "12", requiresBox: true, requiresMac: true },
  { id: "IPTV-BAS-001", name: "IPTV Basic Package", category: "TV", price: 30, sku: "IPTV-BAS-001", features: ["100+ Channels", "HD Quality", "DVR Recording"], portalUrlTemplate: "https://iptv.basic.example.com/portal/{customerId}", billingUrlTemplate: "https://billing.iptv.basic.example.com/account/{customerId}", defaultDuration: "12", requiresBox: true, requiresMac: true },
  { id: "VPN-001", name: "VPN Service", category: "Security", price: 15, sku: "VPN-001", features: ["Global Servers", "No Logs Policy", "Multiple Devices"], portalUrlTemplate: "https://vpn.example.com/dashboard/{customerId}", billingUrlTemplate: "https://billing.vpn.example.com/customer/{customerId}", defaultDuration: "12", requiresBox: false, requiresMac: false },
  { id: "IPTV-PRE-001", name: "IPTV Premium Package", category: "TV", price: 60, sku: "IPTV-PRE-001", features: ["300+ Channels", "4K Quality", "Sports Packages"], portalUrlTemplate: "https://iptv.premium.example.com/portal/{customerId}", billingUrlTemplate: "https://billing.iptv.premium.example.com/account/{customerId}", defaultDuration: "12", requiresBox: true, requiresMac: true },
];

const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-semibold text-slate-950">{title}</h3>{description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}<div className="mt-6">{children}</div></section>;
const phonePattern = /^\+[1-9]\d{7,14}$/;
const parseCurrency = (value: string) => parseFloat(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
const formatCurrency = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(typeof value === "number" ? value : parseCurrency(value));
const generateReference = (prefix: string) => `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const createFormState = (): FormState => ({ customerName: "", customerPhone: "", customerWhatsapp: "", customerEmail: "", customerAddress: "", customerCity: "", customerCountry: "", customerNotes: "", customerCode: generateReference("CUST"), serviceId: generateReference("SRV"), transactionId: generateReference("TXN") });
const createDraft = (template?: Template): ServiceDraft => ({ id: crypto.randomUUID(), templateId: template?.id || "", startDate: "", paymentDate: "", paymentMode: "Cash", amount: template ? String(template.price.toFixed(2)) : "", duration: template?.defaultDuration || "12", box: "", mac: "" });
const getTemplate = (id: string) => templates.find((template) => template.id === id) || null;
const buildExpiry = (paymentDate: string, duration: string) => { if (!paymentDate) return ""; const next = new Date(paymentDate); next.setMonth(next.getMonth() + (parseInt(duration, 10) || 12)); return next.toISOString().slice(0, 10); };

export default function AddCustomer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormState>(createFormState);
  const [draft, setDraft] = useState<ServiceDraft>(createDraft());
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = useMemo(() => services.reduce((sum, service) => sum + parseCurrency(service.amount), 0), [services]);
  const primaryService = services[0] || null;
  const primaryTemplate = primaryService ? getTemplate(primaryService.templateId) : null;
  const selectedTemplate = getTemplate(draft.templateId);
  const metrics = [
    ["Customer code", formData.customerCode],
    ["Primary service ID", formData.serviceId],
    ["Initial transaction", formData.transactionId],
    ["Configured services", String(services.length)],
    ["Order total", services.length ? formatCurrency(totalAmount) : "Not set"],
    ["Primary expiry", primaryService ? buildExpiry(primaryService.paymentDate, primaryService.duration) : "Not set"],
  ];

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleDraftChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === "templateId") {
      const template = getTemplate(value);
      setDraft((current) => ({ ...current, templateId: value, amount: template ? String(template.price.toFixed(2)) : current.amount, duration: template?.defaultDuration || current.duration, box: template?.requiresBox ? current.box : "", mac: template?.requiresMac ? current.mac : "" }));
      return;
    }
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const openServiceModal = (template?: Template) => {
    setEditingServiceId(null);
    setDraft(createDraft(template));
    setIsServiceModalOpen(true);
    setNotice(null);
  };

  const editService = (service: ServiceDraft) => {
    setEditingServiceId(service.id);
    setDraft({ ...service });
    setIsServiceModalOpen(true);
    setNotice(null);
  };

  const closeServiceModal = () => {
    setIsServiceModalOpen(false);
    setEditingServiceId(null);
    setDraft(createDraft());
  };

  const saveServiceDraft = () => {
    if (!selectedTemplate || !draft.startDate || !draft.paymentDate || !draft.amount) return setNotice({ type: "error", text: "Choose a service and complete the service setup before adding it." });
    if (selectedTemplate.requiresBox && !draft.box.trim()) return setNotice({ type: "error", text: `Box ID is required for ${selectedTemplate.name}.` });
    if (selectedTemplate.requiresMac && !draft.mac.trim()) return setNotice({ type: "error", text: `MAC address is required for ${selectedTemplate.name}.` });
    setServices((current) =>
      editingServiceId
        ? current.map((service) => (service.id === editingServiceId ? { ...draft } : service))
        : [...current, draft]
    );
    closeServiceModal();
    setNotice(null);
  };

  const resetForm = () => { setFormData(createFormState()); setDraft(createDraft()); setServices([]); setNotice(null); setIsServiceModalOpen(false); setEditingServiceId(null); };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!formData.customerName.trim() || !formData.customerEmail.trim()) return setNotice({ type: "error", text: "Customer name and email are required." });
    if (!phonePattern.test(formData.customerPhone.trim())) return setNotice({ type: "error", text: "Phone number must use international format, for example +919876543210." });
    if (formData.customerWhatsapp && !phonePattern.test(formData.customerWhatsapp.trim())) return setNotice({ type: "error", text: "WhatsApp number must use international format, for example +919876543210." });
    if (!primaryService || !primaryTemplate) return setNotice({ type: "error", text: "Add at least one configured service before saving the customer." });
    setIsSubmitting(true);
    try {
      const servicePayloads: CustomerServiceInput[] = services.map((service, index) => {
        const template = getTemplate(service.templateId);
        if (!template) throw new Error("A configured service is missing its template.");
        return { planCode: template.id, templateId: template.id, name: template.name, category: template.category, sku: template.sku, description: template.features.join(", "), features: template.features, paymentMode: service.paymentMode, amount: service.amount, durationMonths: service.duration, startDate: service.startDate, paymentDate: service.paymentDate, expiryDate: buildExpiry(service.paymentDate, service.duration), box: service.box, mac: service.mac, portalUrl: template.portalUrlTemplate.replace("{customerId}", formData.customerCode), billingUrl: template.billingUrlTemplate.replace("{customerId}", formData.customerCode), maxConnections: template.id === "VPN-001" ? 5 : template.id.includes("PRE") ? 2 : 1, transactionId: formData.transactionId, serviceCode: `${formData.serviceId}-${String(index + 1).padStart(2, "0")}` };
      });
      const customer = await createCustomer({ customerCode: formData.customerCode, serviceId: formData.serviceId, transactionId: formData.transactionId, name: formData.customerName, email: formData.customerEmail, phone: formData.customerPhone, whatsappNumber: formData.customerWhatsapp || formData.customerPhone, address: formData.customerAddress, city: formData.customerCity, country: formData.customerCountry, status: "active", avatar: "/images/user/user-02.png", role: "customer", mac: primaryService.mac, box: primaryService.box, startDate: primaryService.startDate, paymentDate: primaryService.paymentDate, paymentMode: primaryService.paymentMode, amount: totalAmount.toFixed(2), expiryDate: buildExpiry(primaryService.paymentDate, primaryService.duration), totalCredit: totalAmount.toFixed(2), alreadyGiven: "0.00", remainingCredits: totalAmount.toFixed(2), note: formData.customerNotes || `Customer with ${services.length} services`, serviceDuration: primaryService.duration, services: servicePayloads });
      setNotice({ type: "success", text: customer.portalSetup?.temporaryPassword ? `Customer created. Temporary portal password: ${customer.portalSetup.temporaryPassword}` : "Customer created successfully." });
      setTimeout(() => { resetForm(); navigate(`/customers/${customer.id}`, { state: { portalSetup: customer.portalSetup || null } }); }, 1200);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to create the customer record." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3"><Link to="/customers" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Back</Link></div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">New Customer</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Create a customer account</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">This version matches the rest of the CRM: clean sections, service-first setup, and no leftover demo wizard styling.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-slate-900">{value}</p></div>)}</div>
        </div>
      </section>

      {notice ? <div className={`rounded-3xl border p-4 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{notice.text}</div> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Section title="Customer identity" description="Capture clean contact details once so support, billing, and notifications stay aligned.">
              <div className="grid gap-4 md:grid-cols-2">
                <input name="customerName" value={formData.customerName} onChange={handleFormChange} placeholder="Customer name" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerEmail" value={formData.customerEmail} onChange={handleFormChange} placeholder="Email address" type="email" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerPhone" value={formData.customerPhone} onChange={handleFormChange} placeholder="+919876543210" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerWhatsapp" value={formData.customerWhatsapp} onChange={handleFormChange} placeholder="WhatsApp number" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerCity" value={formData.customerCity} onChange={handleFormChange} placeholder="City" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerCountry" value={formData.customerCountry} onChange={handleFormChange} placeholder="Country" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
                <input name="customerAddress" value={formData.customerAddress} onChange={handleFormChange} placeholder="Address" className="md:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
              </div>
            </Section>

            <Section title="Service catalog" description="Pick a plan here, then configure it from a popup so editable fields stay focused and generated fields stay read-only.">
              <div className="grid gap-4 xl:grid-cols-2">{templates.map((template) => <article key={template.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{template.category}</div><h4 className="mt-2 text-lg font-semibold text-slate-950">{template.name}</h4></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(template.price)}</div></div><div className="mt-4 flex flex-wrap gap-2">{template.features.map((feature) => <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{feature}</span>)}</div><div className="mt-5 flex items-center justify-between gap-4"><div className="text-sm text-slate-500">{template.defaultDuration} month default term</div><button type="button" onClick={() => openServiceModal(template)} className="rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50">Configure in popup</button></div></article>)}</div>
            </Section>

            <Section title="Configured services" description="These become the customer’s real starting subscriptions.">
              {services.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">No services configured yet.</div> : <div className="space-y-4">{services.map((service, index) => { const template = getTemplate(service.templateId); if (!template) return null; return <article key={service.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h4 className="text-lg font-semibold text-slate-950">{template.name}</h4>{index === 0 ? <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">Primary service</span> : null}</div><p className="mt-2 text-sm text-slate-500">{template.category} • {template.sku}</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => editService(service)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white">Edit</button><button type="button" onClick={() => setServices((current) => current.filter((item) => item.id !== service.id))} className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50">Remove</button></div></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Amount", formatCurrency(service.amount)], ["Payment mode", service.paymentMode], ["Start date", service.startDate], ["Payment date", service.paymentDate], ["Expiry date", buildExpiry(service.paymentDate, service.duration)], ["Duration", `${service.duration} months`], ["Box ID", service.box || "Not required"], ["MAC", service.mac || "Not required"]].map(([label, value]) => <div key={`${service.id}-${label}`} className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div>)}</div></article>; })}</div>}
            </Section>

            <Section title="Internal notes"><textarea name="customerNotes" value={formData.customerNotes} onChange={handleFormChange} rows={6} placeholder="Document installation notes, billing context, or follow-up tasks." className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></Section>
          </div>

          <div className="space-y-6">
            <Section title="Account snapshot" description="These references and totals are prepared before save so operators know exactly what will be created."><div className="space-y-4">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-slate-900">{value}</div></div>)}</div></Section>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">Save the customer record to create the account and move into the customer profile.</div>
          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Reset form</button>
            <Link to="/customers" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{isSubmitting ? "Creating customer..." : "Create customer"}</button>
          </div>
        </section>
      </form>

      {isServiceModalOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"><div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">{editingServiceId ? "Edit service" : "Add service"}</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedTemplate ? selectedTemplate.name : "Service setup"}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Use the popup to configure only the operational fields. Generated references and links stay read-only.</p></div><button type="button" onClick={closeServiceModal} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Close</button></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="space-y-6"><section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h4 className="text-lg font-semibold text-slate-950">Plan selection</h4><p className="mt-2 text-sm text-slate-500">{editingServiceId ? "The plan stays locked while editing so service identity remains consistent." : "Choose the service first, then complete the billing and device fields below."}</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Service plan</span><select name="templateId" value={draft.templateId} onChange={handleDraftChange} disabled={Boolean(editingServiceId)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"><option value="">Select a plan</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Plan code</span><input value={selectedTemplate?.sku || "Will appear after plan selection"} disabled className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none" /></label></div></section><section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h4 className="text-lg font-semibold text-slate-950">Billing schedule</h4><p className="mt-2 text-sm text-slate-500">Dates come first, followed by payment details and duration. This keeps the setup aligned with the rest of the CRM.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Start date</span><input type="date" name="startDate" value={draft.startDate} onChange={handleDraftChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Payment date</span><input type="date" name="paymentDate" value={draft.paymentDate} onChange={handleDraftChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Payment mode</span><select name="paymentMode" value={draft.paymentMode} onChange={handleDraftChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"><option value="Cash">Cash</option><option value="Credit Card">Credit Card</option><option value="Debit Card">Debit Card</option><option value="Bank Transfer">Bank Transfer</option><option value="PayPal">PayPal</option><option value="Other">Other</option></select></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Amount</span><input type="number" min="0" step="0.01" name="amount" value={draft.amount} onChange={handleDraftChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Duration (months)</span><input type="number" min="1" step="1" name="duration" value={draft.duration} onChange={handleDraftChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label><label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Calculated expiry</span><input value={buildExpiry(draft.paymentDate, draft.duration) || "Will calculate after payment date"} disabled className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none" /></label></div></section>{selectedTemplate?.requiresBox || selectedTemplate?.requiresMac ? <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h4 className="text-lg font-semibold text-slate-950">Device credentials</h4><p className="mt-2 text-sm text-slate-500">Only installation-specific identifiers stay editable here.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{selectedTemplate.requiresBox ? <label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">Box ID</span><input name="box" value={draft.box} onChange={handleDraftChange} placeholder="STB-1024" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label> : null}{selectedTemplate.requiresMac ? <label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">MAC address</span><input name="mac" value={draft.mac} onChange={handleDraftChange} placeholder="AA:BB:CC:DD:EE:FF" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" /></label> : null}</div></section> : null}</div><aside className="space-y-6"><section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h4 className="text-lg font-semibold text-slate-950">Generated references</h4><div className="mt-4 space-y-4">{[["Customer code", formData.customerCode], ["Base service ID", formData.serviceId], ["Transaction ID", formData.transactionId], ["Portal URL", selectedTemplate ? selectedTemplate.portalUrlTemplate.replace("{customerId}", formData.customerCode) : "Select a plan first"], ["Billing URL", selectedTemplate ? selectedTemplate.billingUrlTemplate.replace("{customerId}", formData.customerCode) : "Select a plan first"]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div><div className="mt-2 break-all text-sm font-medium text-slate-900">{value}</div></div>)}</div></section>{selectedTemplate ? <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h4 className="text-lg font-semibold text-slate-950">Included in plan</h4><div className="mt-4 flex flex-wrap gap-2">{selectedTemplate.features.map((feature) => <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{feature}</span>)}</div><div className="mt-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Template price</div><div className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(selectedTemplate.price)}</div></div></section> : null}</aside></div><div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Save to attach this service to the customer draft. You can still review or remove it before creating the account.</p><div className="flex flex-wrap gap-3"><button type="button" onClick={closeServiceModal} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button><button type="button" onClick={saveServiceDraft} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">Save service</button></div></div></div></div> : null}
    </div>
  );
}
