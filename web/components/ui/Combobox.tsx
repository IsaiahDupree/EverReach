"use client"

import { useState, Fragment } from 'react'
import { Combobox as HeadlessCombobox, Transition } from '@headlessui/react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  label?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  disabled,
}: ComboboxProps) {
  const [query, setQuery] = useState('')

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        )

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <HeadlessCombobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
            <HeadlessCombobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
              displayValue={() => selectedOption?.label ?? ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <HeadlessCombobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </HeadlessCombobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <HeadlessCombobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <HeadlessCombobox.Option
                    key={option.value}
                    className={({ active }) =>
                      cn(
                        'relative cursor-default select-none py-2 pl-10 pr-4',
                        active ? 'bg-blue-600 text-white' : 'text-gray-900'
                      )
                    }
                    value={option.value}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={cn(
                            'block truncate',
                            selected ? 'font-medium' : 'font-normal'
                          )}
                        >
                          {option.label}
                        </span>
                        {selected ? (
                          <span
                            className={cn(
                              'absolute inset-y-0 left-0 flex items-center pl-3',
                              active ? 'text-white' : 'text-blue-600'
                            )}
                          >
                            <Check className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </HeadlessCombobox.Option>
                ))
              )}
            </HeadlessCombobox.Options>
          </Transition>
        </div>
      </HeadlessCombobox>
    </div>
  )
}
