'use client';

import { useEffect, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';
import { CurrencyDollarIcon, ShoppingBagIcon, DocumentTextIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  change: number;
  changeType: 'increase' | 'decrease';
  href: string;
}

function StatCard({ title, value, icon: Icon, change, changeType, href }: StatCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span
              className={classNames(
                changeType === 'increase' ? 'text-green-600' : 'text-red-600',
                'inline-flex items-center'
              )}
            >
              {changeType === 'increase' ? (
                <ArrowUpIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <ArrowDownIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              )}
              {change}%
            </span>
            <span className="ml-1 text-gray-500">from last month</span>
          </div>
          <Link href={href} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'product';
  title: string;
  date: string;
  amount?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: '₹0',
    totalProducts: '0',
    totalInvoices: '0',
    lowStock: '0',
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch dashboard data
    setTimeout(() => {
      setStats({
        totalSales: '₹45,000',
        totalProducts: '24',
        totalInvoices: '18',
        lowStock: '3',
      });
      
      setRecentActivity([
        {
          id: '1',
          type: 'invoice',
          title: 'Invoice #INV-001 created',
          date: '2 hours ago',
          amount: '₹5,600',
        },
        {
          id: '2',
          type: 'product',
          title: 'Added 5 units of Product A',
          date: '4 hours ago',
        },
        {
          id: '3',
          type: 'invoice',
          title: 'Invoice #INV-002 paid',
          date: '1 day ago',
          amount: '₹12,400',
        },
        {
          id: '4',
          type: 'product',
          title: 'Updated stock for Product B',
          date: '2 days ago',
        },
      ]);
      
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon={CurrencyDollarIcon}
          change={12}
          changeType="increase"
          href="/dashboard/invoices"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={ShoppingBagIcon}
          change={5}
          changeType="increase"
          href="/dashboard/products"
        />
        <StatCard
          title="Total Invoices"
          value={stats.totalInvoices}
          icon={DocumentTextIcon}
          change={8}
          changeType="increase"
          href="/dashboard/invoices"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStock}
          icon={ExclamationCircleIcon}
          change={2}
          changeType="decrease"
          href="/dashboard/products?filter=low-stock"
        />
      </div>

      <div className="mt-10">
        <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Activity</h3>
        <div className="mt-5 flow-root">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <ul role="list" className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="p-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {activity.type === 'invoice' ? (
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      ) : (
                        <ShoppingBagIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      )}
                      <p className="ml-2 text-sm font-medium text-gray-900">{activity.title}</p>
                    </div>
                    <div className="flex items-center">
                      {activity.amount && (
                        <span className="mr-4 text-sm font-medium text-gray-900">{activity.amount}</span>
                      )}
                      <time className="text-sm text-gray-500">{activity.date}</time>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
