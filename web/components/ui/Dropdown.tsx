"use client"

import { Fragment, type ReactNode } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as="div">{trigger}</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <Menu.Item key={index} disabled={item.disabled}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors',
                      active && !item.disabled && 'bg-gray-100',
                      item.danger && 'text-red-600',
                      !item.danger && !item.disabled && 'text-gray-900',
                      item.disabled && 'text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

// Helper component for dropdown trigger button
export function DropdownButton({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4" />
    </button>
  )
}
