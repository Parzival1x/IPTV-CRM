import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { CUSTOMERS_DATA } from "../../data/customers";
import TwilioWhatsAppMessaging from "../common/TwilioWhatsAppMessaging";

export default function RecentOrders() {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Get recent customers (sorted by most recent payment date)
  const recentCustomers = CUSTOMERS_DATA.sort(
    (a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  ).slice(0, 5);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Customer Activity
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.29004 5.90393H17.7067"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.7075 14.0961H2.29085"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.33325 10.0002H11.6666"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Customer
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Service
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Payment
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Credits
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentCustomers.map((customer) => (
              <TableRow key={customer.id} className="">
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-[50px] w-[50px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-xl">{customer.avatar}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {customer.name}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        {customer.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div>
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {customer.box}
                    </p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      {customer.role}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div>
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {customer.amount}
                    </p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      {customer.paymentDate} • {customer.paymentMode}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    size="sm"
                    color={
                      customer.status === "Active"
                        ? "success"
                        : customer.status === "Pending"
                        ? "warning"
                        : "error"
                    }
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <div>
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {customer.remainingCredits}
                    </p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      of {customer.totalCredit}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <button
                    onClick={() => {
                      setSelectedCustomer({
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email
                      });
                      setShowWhatsAppModal(true);
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.595z"/>
                    </svg>
                    Message
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Twilio WhatsApp Messaging Modal */}
      {showWhatsAppModal && selectedCustomer && (
        <TwilioWhatsAppMessaging
          isOpen={showWhatsAppModal}
          customer={selectedCustomer}
          onClose={() => {
            setShowWhatsAppModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            setShowWhatsAppModal(false);
            setSelectedCustomer(null);
          }}
          onError={(error) => {
            console.error('WhatsApp message failed:', error);
          }}
        />
      )}
    </div>
  );
}
