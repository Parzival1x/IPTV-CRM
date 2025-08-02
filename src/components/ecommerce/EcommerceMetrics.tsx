import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { CUSTOMERS_DATA } from "../../data/customers";

export default function EcommerceMetrics() {
  // Calculate actual metrics from customer data
  const totalCustomers = CUSTOMERS_DATA.length;
  const activeCustomers = CUSTOMERS_DATA.filter(customer => customer.status === 'Active').length;
  const pendingCustomers = CUSTOMERS_DATA.filter(customer => customer.status === 'Pending').length;
  const inactiveCustomers = CUSTOMERS_DATA.filter(customer => customer.status === 'Inactive').length;
  
  // Calculate total revenue from all customers
  const totalRevenue = CUSTOMERS_DATA.reduce((sum, customer) => {
    const amount = parseFloat(customer.amount.replace('$', ''));
    return sum + amount;
  }, 0);
  
  // Calculate total credits and remaining credits
  const totalCredits = CUSTOMERS_DATA.reduce((sum, customer) => {
    const credit = parseFloat(customer.totalCredit.replace('$', ''));
    return sum + credit;
  }, 0);
  
  const totalRemainingCredits = CUSTOMERS_DATA.reduce((sum, customer) => {
    const remaining = parseFloat(customer.remainingCredits.replace('$', ''));
    return sum + remaining;
  }, 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
      {/* Total Customers Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Customers
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalCustomers}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <GroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="mr-2">
            <Badge
              color="success"
              startIcon={<ArrowUpIcon className="h-3 w-3" />}
            >
              {activeCustomers} Active
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pendingCustomers} Pending, {inactiveCustomers} Inactive
          </p>
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totalRevenue.toFixed(2)}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="mr-2">
            <Badge
              color="success"
              startIcon={<ArrowUpIcon className="h-3 w-3" />}
            >
              ${(totalRevenue / totalCustomers).toFixed(2)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            avg per customer
          </p>
        </div>
      </div>

      {/* Total Credits Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Credits
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totalCredits.toFixed(2)}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="mr-2">
            <Badge
              color="warning"
              startIcon={<ArrowDownIcon className="h-3 w-3" />}
            >
              ${totalRemainingCredits.toFixed(2)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            remaining credits
          </p>
        </div>
      </div>

      {/* Services/Boxes Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Services
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {activeCustomers}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
            <BoxIconLine className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="mr-2">
            <Badge
              color="success"
              startIcon={<ArrowUpIcon className="h-3 w-3" />}
            >
              {Math.round((activeCustomers / totalCustomers) * 100)}%
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            active rate
          </p>
        </div>
      </div>
    </div>
  );
}
