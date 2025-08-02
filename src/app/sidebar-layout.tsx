"use client";

import { Fragment, useState } from "react";
import { Dialog, Menu, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  HomeIcon,
  XMarkIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  UserIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  {
    name: "Products",
    href: "/products",
    icon: ShoppingCartIcon,
    children: [{ name: "Add Products", href: "/products/add" }],
  },
  { name: "Invoices", href: "/invoices", icon: DocumentTextIcon },
  { name: "Create Invoice", href: "/invoices/create", icon: DocumentTextIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const session = useSession();
const user = session.data?.user;


  return (
    <div>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-blue-600"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <h4 className="font-bold text-blue-600">
                      Akanksha Enterprises
                    </h4>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              {item.children ? (
                                <div>
                                  <Link
                                    href={item.href}
                                    className={classNames(
                                      pathname.startsWith(item.href)
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                    )}
                                  >
                                    <item.icon
                                      className={classNames(
                                        pathname.startsWith(item.href)
                                          ? "text-blue-600"
                                          : "text-gray-400 group-hover:text-blue-600",
                                        "h-6 w-6 shrink-0"
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                  <ul className="mt-1 pl-8 space-y-1">
                                    {item.children.map((child) => (
                                      <li key={child.name}>
                                        <Link
                                          href={child.href}
                                          className={classNames(
                                            pathname === child.href
                                              ? "bg-blue-50 text-blue-600"
                                              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                                            "block rounded-md py-2 pl-2 text-sm leading-6"
                                          )}
                                        >
                                          {child.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <Link
                                  href={item.href}
                                  className={classNames(
                                    pathname === item.href
                                      ? "bg-blue-50 text-blue-600"
                                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                  )}
                                >
                                  <item.icon
                                    className={classNames(
                                      pathname === item.href
                                        ? "text-blue-600"
                                        : "text-gray-400 group-hover:text-blue-600",
                                      "h-6 w-6 shrink-0"
                                    )}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                      <li className="mt-auto">
                        <Link
                          href="/settings"
                          className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <CogIcon
                            className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-blue-600"
                            aria-hidden="true"
                          />
                          Settings
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h4 className="font-bold text-blue-600">Akanksha Enterprises</h4>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      {item.children ? (
                        <div>
                          <Link
                            href={item.href}
                            className={classNames(
                              pathname.startsWith(item.href)
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                              "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                            )}
                          >
                            <item.icon
                              className={classNames(
                                pathname.startsWith(item.href)
                                  ? "text-blue-600"
                                  : "text-gray-400 group-hover:text-blue-600",
                                "h-6 w-6 shrink-0"
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                          <ul className="mt-1 pl-8 space-y-1">
                            {item.children.map((child) => (
                              <li key={child.name}>
                                <Link
                                  href={child.href}
                                  className={classNames(
                                    pathname === child.href
                                      ? "bg-blue-50 text-blue-600"
                                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                                    "block rounded-md py-2 pl-2 text-sm leading-6"
                                  )}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className={classNames(
                            pathname === item.href
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:text-blue-600 hover:bg-blue-50",
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                          )}
                        >
                          <item.icon
                            className={classNames(
                              pathname === item.href
                                ? "text-blue-600"
                                : "text-gray-400 group-hover:text-blue-600",
                              "h-6 w-6 shrink-0"
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <Link
                  href="/settings"
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  <CogIcon
                    className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-blue-600"
                    aria-hidden="true"
                  />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky w-full top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-blue-100 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-blue-600 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex justify-between w-full items-center">
            <h4>Welcome, {user?.name }</h4>
            <button
              onClick={handleSignOut}
              className="px-5 py-2 text-sm font-semibold bg-blue-500 rounded-2xl duration-200 text-gray-900 hover:bg-blue-50 hover:text-blue-600"
            >
              Log out
            </button>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
