import type { CustomerSubscription } from "../../data/customersDB";
import ServiceDetailsCard from "./ServiceDetailsCard";

type ServiceDetailsModalProps = {
  isOpen: boolean;
  service: CustomerSubscription | null;
  onClose: () => void;
};

export default function ServiceDetailsModal({
  isOpen,
  service,
  onClose,
}: ServiceDetailsModalProps) {
  if (!isOpen || !service) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Service Details
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {service.serviceLabel || service.planName || "Customer service"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-6">
          <ServiceDetailsCard service={service} />
        </div>
      </div>
    </div>
  );
}
