import { Combobox, Dialog, Transition } from '@headlessui/react'
import {
  ChevronUpDownIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { yupResolver } from '@hookform/resolvers/yup'
import { Mercoa } from '@mercoa/javascript'
import debounce from 'lodash/debounce'
import { Fragment, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { capitalize, constructFullName } from '../lib/lib'
import {
  BankAccount,
  Card,
  Check,
  CustomPaymentMethod,
  DebouncedSearch,
  EntityOnboardingForm,
  LoadingSpinnerIcon,
  MercoaButton,
  MercoaContext,
  MercoaInput,
  NoSession,
  TableNavigation,
  Tooltip,
  inputClassName,
  useMercoaSession,
} from './index'
const human = require('humanparser')

export async function onSubmitCounterparty({
  data,
  mercoaSession,
  type,
  setError,
  onSelect,
}: {
  data: any
  mercoaSession: MercoaContext
  type: 'payee' | 'payor'
  setError: any
  onSelect?: (counterparty: Mercoa.CounterpartyResponse | undefined) => any
}) {
  if (!mercoaSession.entity?.id) return
  const profile: Mercoa.ProfileRequest = {}

  if (data.accountType === 'individual') {
    profile.individual = {
      email: data.email,
      name: {
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        middleName: data.middleName ?? '',
        suffix: data.suffix ?? '',
      },
    }

    if (!profile.individual.name.firstName) {
      setError('vendor.firstName', {
        type: 'manual',
        message: 'First Name is required',
      })
      return
    }
    if (!profile.individual.name.lastName) {
      setError('vendor.lastName', {
        type: 'manual',
        message: 'Last Name is required',
      })
      return
    }
  } else {
    profile.business = {
      email: data.email,
      description: data.description,
      website: data.website,
      legalBusinessName: data.name,
    }
    if (!profile.business.legalBusinessName) {
      setError('vendor.name', {
        type: 'manual',
        message: 'Name is required',
      })
      return
    }
    if (!profile.business.website && !profile.business.description) {
      setError('vendor.website', {
        type: 'manual',
        message: 'Website or description is required',
      })
      setError('vendor.description', {
        type: 'manual',
        message: 'Website or description is required',
      })
      return
    }
  }

  let counterparty: Mercoa.CounterpartyResponse | undefined = undefined

  if (data?.id && data.id !== 'new') {
    counterparty = await mercoaSession.client?.entity.update(data.id, {
      profile,
      accountType: data.accountType,
    })
  } else {
    counterparty = await mercoaSession.client?.entity.create({
      profile,
      accountType: data.accountType,
      isPayee: type === 'payee',
      isPayor: type === 'payor',
      isCustomer: false,
    })
  }

  if (!counterparty?.id) return

  if (type === 'payee') {
    await mercoaSession.client?.entity.counterparty.addPayees(mercoaSession.entity.id, {
      payees: [counterparty.id],
    })
  } else {
    await mercoaSession.client?.entity.counterparty.addPayors(mercoaSession.entity.id, {
      payors: [counterparty.id],
    })
  }
  if (onSelect) onSelect(counterparty)
}

export const counterpartyYupValidation = {
  id: yup.string().nullable(),
  name: yup.string().typeError('Please enter a name'),
  email: yup.string().email('Please enter a valid email'),
  accountType: yup.string(),
  firstName: yup.string(),
  lastName: yup.string(),
  middleName: yup.string(),
  suffix: yup.string(),
  website: yup.string().url('Website must start with http:// or https:// and be a valid URL'),
  description: yup.string(),
}

export function CounterpartySearch({
  counterparty,
  disableCreation,
  onSelect,
  type,
  network,
}: {
  counterparty?: Mercoa.CounterpartyResponse
  disableCreation?: boolean
  onSelect?: (counterparty: Mercoa.CounterpartyResponse | undefined) => any
  type: 'payee' | 'payor'
  network?: Mercoa.CounterpartyNetworkType[]
}) {
  const mercoaSession = useMercoaSession()

  const [edit, setEdit] = useState<boolean>(false)

  const methods = useForm({
    resolver: yupResolver(
      yup
        .object({
          vendor: yup.object().shape(counterpartyYupValidation),
        })
        .required(),
    ),
    defaultValues: {
      vendor: {
        id: counterparty?.id,
        accountType: counterparty?.accountType,
        name: counterparty?.name,
        firstName: counterparty?.profile?.individual?.name?.firstName,
        lastName: counterparty?.profile?.individual?.name?.lastName,
        middleName: counterparty?.profile?.individual?.name?.middleName,
        suffix: counterparty?.profile?.individual?.name?.suffix,
        email:
          counterparty?.accountType === 'business'
            ? counterparty?.profile?.business?.email
            : counterparty?.profile?.individual?.email,
        website: counterparty?.profile?.business?.website,
        description: counterparty?.profile?.business?.description,
      },
    },
  })

  const { handleSubmit, setError } = methods

  const onSubmit = async (overall: any) => {
    if (!mercoaSession.entity?.id) return
    const data = overall.vendor
    await onSubmitCounterparty({
      data,
      mercoaSession,
      type,
      setError,
      onSelect: (e) => {
        onSelect?.(e)
        setEdit(false)
      },
    })
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mercoa-p-3 mercoa-bg-gray-100 mercoa-rounded-mercoa mercoa-relative mercoa-w-full"
      >
        <CounterpartySearchBase
          counterparty={counterparty}
          disableCreation={disableCreation}
          onSelect={onSelect}
          type={type}
          network={network}
          edit={edit}
          setEdit={setEdit}
        />
      </form>
    </FormProvider>
  )
}

export function PayableCounterpartySearch({
  counterparty,
  disableCreation,
  onSelect,
  network,
}: {
  counterparty?: Mercoa.CounterpartyResponse
  disableCreation?: boolean
  onSelect?: (counterparty: Mercoa.CounterpartyResponse | undefined) => any
  network?: Mercoa.CounterpartyNetworkType[]
}) {
  const [edit, setEdit] = useState<boolean>(false)
  const {
    formState: { errors },
  } = useFormContext()

  useEffect(() => {
    setEdit(false)
  }, [counterparty])

  return (
    <>
      <div className="sm:mercoa-col-span-3">
        <label
          htmlFor="vendor-name"
          className="mercoa-block mercoa-text-lg mercoa-font-medium mercoa-leading-6 mercoa-text-gray-700"
        >
          Vendor
        </label>

        <div className="mercoa-mt-2 mercoa-flex mercoa-items-center mercoa-justify-left">
          <div className="mercoa-p-3 mercoa-bg-gray-100 mercoa-rounded-mercoa mercoa-relative mercoa-w-full">
            <CounterpartySearchBase
              counterparty={counterparty}
              disableCreation={disableCreation}
              onSelect={onSelect}
              type={'payee'}
              network={network}
              edit={edit}
              setEdit={setEdit}
            />
          </div>
        </div>
        {errors.vendorId?.message && (
          <p className="mercoa-text-sm mercoa-text-red-500">{errors.vendorId?.message.toString()}</p>
        )}
      </div>
    </>
  )
}

export function AddCounterpartyModal({
  type,
  show,
  setShow,
}: {
  type: 'payor' | 'payee'
  show: boolean
  setShow: (show: boolean) => void
}) {
  const mercoaSession = useMercoaSession()

  const methods = useForm({
    resolver: yupResolver(
      yup
        .object({
          vendor: yup.object().shape(counterpartyYupValidation),
        })
        .required(),
    ),
    defaultValues: {
      vendor: {
        id: '',
        accountType: 'business',
        name: '',
        firstName: '',
        lastName: '',
        middleName: '',
        suffix: '',
        email: '',
        website: '',
        description: '',
      },
    },
  })

  const { handleSubmit, setError } = methods

  const onSubmit = async (overall: any) => {
    if (!mercoaSession.entity?.id) return
    const data = overall.vendor
    await onSubmitCounterparty({
      data,
      mercoaSession,
      type,
      setError,
      onSelect: (e) => {
        setShow(false)
        mercoaSession.refresh()
      },
    })
  }

  if (!mercoaSession.client) return <NoSession componentName="AddCounterpartyModal" />
  return (
    <Transition.Root show={show} as={Fragment}>
      <Dialog
        as="div"
        className="mercoa-relative mercoa-z-10"
        onClose={() => {
          mercoaSession.refresh()
          setShow(false)
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="mercoa-ease-out mercoa-duration-300"
          enterFrom="mercoa-opacity-0"
          enterTo="mercoa-opacity-100"
          leave="mercoa-ease-in mercoa-duration-200"
          leaveFrom="mercoa-opacity-100"
          leaveTo="mercoa-opacity-0"
        >
          <div className="mercoa-fixed mercoa-inset-0 mercoa-bg-gray-500 mercoa-bg-mercoa-opacity-75 mercoa-transition-opacity" />
        </Transition.Child>

        <div className="mercoa-fixed mercoa-inset-0 mercoa-z-10 mercoa-overflow-y-auto">
          <div className="mercoa-flex mercoa-min-h-full mercoa-items-end mercoa-justify-center mercoa-p-4 mercoa-text-center sm:mercoa-items-center sm:mercoa-p-0">
            <Transition.Child
              as={Fragment}
              enter="mercoa-ease-out mercoa-duration-300"
              enterFrom="mercoa-opacity-0 mercoa-translate-y-4 sm:mercoa-translate-y-0 sm:mercoa-scale-95"
              enterTo="mercoa-opacity-100 mercoa-translate-y-0 sm:mercoa-scale-100"
              leave="mercoa-ease-in mercoa-duration-200"
              leaveFrom="mercoa-opacity-100 mercoa-translate-y-0 sm:mercoa-scale-100"
              leaveTo="mercoa-opacity-0 mercoa-translate-y-4 sm:mercoa-translate-y-0 sm:mercoa-scale-95"
            >
              <Dialog.Panel className="mercoa-relative mercoa-transform mercoa-rounded-mercoa mercoa-bg-white mercoa-text-left mercoa-shadow-xl mercoa-transition-all">
                <div className="mercoa-w-[600px]">
                  <FormProvider {...methods}>
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="mercoa-p-3 mercoa-bg-gray-100 mercoa-rounded-mercoa mercoa-relative mercoa-w-full"
                    >
                      <CounterpartyAddOrEditForm
                        onComplete={() => {
                          setShow(false)
                          mercoaSession.refresh()
                        }}
                        onExit={() => {
                          setShow(false)
                        }}
                      />
                    </form>
                  </FormProvider>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

function CounterpartySearchBase({
  counterparty,
  disableCreation,
  onSelect,
  type,
  network,
  edit,
  setEdit,
}: {
  counterparty?: Mercoa.CounterpartyResponse
  disableCreation?: boolean
  onSelect?: (counterparty: Mercoa.CounterpartyResponse | undefined) => any
  type: 'payee' | 'payor'
  network?: Mercoa.CounterpartyNetworkType[]
  edit: boolean
  setEdit: (edit: boolean) => any
}) {
  const mercoaSession = useMercoaSession()

  const buttonRef = useRef<HTMLButtonElement>(null)
  const [input, setInput] = useState<string>('')
  const [search, setSearch] = useState<string>()
  const [counterparties, setCounterparties] = useState<Array<Mercoa.CounterpartyResponse>>()
  const [selectedCounterparty, setSelectedCounterparty] = useState<Mercoa.CounterpartyResponse | undefined>()

  const [searchTerm, setSearchTerm] = useState<string>()
  const debouncedSearch = useRef(debounce(setSearch, 200)).current

  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm])

  // Set selected counterparty, required for OCR
  useEffect(() => {
    if (counterparty) {
      setSelectedCounterparty(counterparty)
    }
  }, [counterparty])

  // Get all counterparties
  useEffect(() => {
    if (!mercoaSession.entity?.id) return
    let networkType: Mercoa.CounterpartyNetworkType[] = [Mercoa.CounterpartyNetworkType.Entity]
    if (
      mercoaSession.iframeOptions?.options?.vendors?.network === 'platform' ||
      mercoaSession.iframeOptions?.options?.vendors?.network === 'all'
    ) {
      networkType.push(Mercoa.CounterpartyNetworkType.Network)
    }
    // of network is passed as a prop, over write the iframe options
    if (network) {
      networkType = [...network]
    }
    if (type === 'payee') {
      mercoaSession.client?.entity.counterparty
        .findPayees(mercoaSession.entity?.id, { paymentMethods: true, networkType, name: search })
        .then((resp) => {
          setCounterparties(resp.data)
        })
    } else {
      mercoaSession.client?.entity.counterparty
        .findPayors(mercoaSession.entity?.id, { paymentMethods: true, networkType, name: search })
        .then((resp) => {
          setCounterparties(resp.data)
        })
    }
  }, [mercoaSession.entity?.id, mercoaSession.token, mercoaSession.refreshId, search])

  function setSelection(counterparty: Mercoa.CounterpartyResponse | undefined) {
    setSelectedCounterparty(counterparty)
    onSelect?.(counterparty)
    if (counterparty) {
      setEdit(false)
    }
  }

  // vendor exists, show text info and edit button
  if (selectedCounterparty?.id && selectedCounterparty?.id !== 'new' && !edit) {
    return (
      <>
        <div className="mercoa-w-full mercoa-flex mercoa-items-center">
          <div className="mercoa-flex-auto">
            <div className="mercoa-flex mercoa-items-center mercoa-bg-gray-50 mercoa-rounded-mercoa">
              <div className="mercoa-flex-auto mercoa-p-3">
                <div className="mercoa-text-sm mercoa-font-medium mercoa-text-gray-900">
                  {selectedCounterparty?.name}
                </div>
                {!mercoaSession.iframeOptions?.options?.vendors?.disableCreation && !disableCreation && (
                  <div className="mercoa-text-sm mercoa-text-gray-500">{selectedCounterparty?.email}</div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelection(undefined)
                }}
                type="button"
                className="mercoa-ml-4 mercoa-flex-shrink-0 mercoa-p-1 mercoa-text-mercoa-primary-text hover:mercoa-opacity-75"
              >
                <XCircleIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />
                <span className="mercoa-sr-only">Clear</span>
              </button>
              {!mercoaSession.iframeOptions?.options?.vendors?.disableCreation && (
                <button
                  onClick={() => {
                    setEdit(true)
                  }}
                  type="button"
                  className="mercoa-ml-4 mercoa-flex-shrink-0 mercoa-p-1 mercoa-text-mercoa-primary-text hover:mercoa-opacity-75"
                >
                  <PencilSquareIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />
                  <span className="mercoa-sr-only">Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Adding a counterparty
  if (selectedCounterparty?.id === 'new') {
    if (input) {
      return (
        <CounterpartyAddOrEditForm
          name={input}
          onComplete={(e) => {
            setSelection(e)
            setTimeout(() => setEdit(true), 100)
          }}
          onExit={onSelect}
        />
      )
    } else if (selectedCounterparty) {
      return (
        <CounterpartyAddOrEditForm counterparty={selectedCounterparty} onComplete={setSelection} onExit={onSelect} />
      )
    }
  }

  // Editing a counterparty
  else if (selectedCounterparty?.id && edit) {
    return <CounterpartyAddOrEditForm counterparty={selectedCounterparty} onComplete={setSelection} onExit={onSelect} />
  }

  // if no counterparties, show loading
  if (!counterparties) {
    return (
      <div className="mercoa-relative mercoa-mt-2">
        <input className={inputClassName({})} placeholder="Loading..." value="Loading..." readOnly />
        <button className="mercoa-absolute mercoa-inset-y-0 mercoa-right-0 mercoa-flex mercoa-items-center mercoa-rounded-r-md mercoa-px-2 focus:mercoa-outline-none">
          <ChevronUpDownIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />
        </button>
      </div>
    )
  }

  mercoaSession.debug({ selectedCounterparty })

  if (!mercoaSession.client) return <NoSession componentName="CounterpartySearch" />

  // Search for a counterparty
  return (
    <Combobox as="div" value={selectedCounterparty} onChange={setSelection} nullable className="mercoa-w-full">
      {({ open }) => (
        <div className="mercoa-relative mercoa-mt-2 mercoa-w-full">
          <Combobox.Input
            placeholder="Enter a company name..."
            autoComplete="off"
            className="mercoa-w-full mercoa-rounded-mercoa mercoa-border-0 mercoa-bg-white mercoa-py-1.5 mercoa-pl-3 mercoa-pr-10 mercoa-text-gray-900 mercoa-shadow-sm mercoa-ring-1 mercoa-ring-inset mercoa-ring-gray-300 focus:mercoa-ring-2 focus:mercoa-ring-inset focus:mercoa-ring-mercoa-primary sm:mercoa-text-sm sm:mercoa-leading-6"
            onFocus={() => {
              if (open) return // don't click button if already open, as it will close it
              setSearchTerm(undefined) // reset filter
              buttonRef.current?.click() // simulate click on button to open dropdown
            }}
            onChange={(event) => {
              setInput(event.target.value)
              setSearchTerm(event.target.value?.toLowerCase() ?? '')
            }}
            displayValue={(e: Mercoa.CounterpartyResponse) => e?.name ?? ''}
          />
          <Combobox.Button
            className="mercoa-absolute mercoa-inset-y-0 mercoa-right-0 mercoa-flex mercoa-items-center mercoa-rounded-r-md mercoa-px-2 focus:mercoa-outline-none"
            ref={buttonRef}
          >
            <ChevronUpDownIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />
          </Combobox.Button>

          <Combobox.Options className="mercoa-absolute mercoa-z-10 mercoa-mt-1 mercoa-max-h-60 mercoa-w-full mercoa-overflow-auto mercoa-rounded-mercoa mercoa-bg-white mercoa-py-1 mercoa-text-base mercoa-shadow-lg mercoa-ring-1 mercoa-ring-black mercoa-ring-opacity-5 focus:mercoa-outline-none sm:mercoa-text-sm">
            {counterparties.map((cp) => (
              <Combobox.Option
                key={cp.id}
                value={cp}
                className={({ active }) =>
                  `mercoa-relative mercoa-cursor-pointer  mercoa-py-2 mercoa-pl-3 mercoa-pr-9 ${
                    active ? 'mercoa-bg-mercoa-primary mercoa-text-mercoa-primary-text-invert' : 'mercoa-text-gray-900'
                  }`
                }
              >
                <span>{cp.name}</span>
              </Combobox.Option>
            ))}
            {!mercoaSession.iframeOptions?.options?.vendors?.disableCreation && (
              <Combobox.Option value={{ id: 'new' }}>
                {({ active }) => (
                  <div
                    className={`mercoa-flex mercoa-items-center mercoa-cursor-pointer  mercoa-py-2 mercoa-pl-3 mercoa-pr-9 ${
                      active
                        ? 'mercoa-bg-mercoa-primary mercoa-text-mercoa-primary-text-invert'
                        : 'mercoa-text-gray-900'
                    }`}
                  >
                    <PlusIcon className="mercoa-size-5 mercoa-pr-1" />
                    Add New
                  </div>
                )}
              </Combobox.Option>
            )}
          </Combobox.Options>
        </div>
      )}
    </Combobox>
  )
}

function CounterpartyAddOrEditForm({
  counterparty,
  name,
  onComplete,
  onExit,
}: {
  counterparty?: Mercoa.CounterpartyResponse
  name?: string
  onComplete: (counterparty?: Mercoa.CounterpartyResponse) => any
  onExit?: (counterparty?: any) => any
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()

  let counterpartyName = name
  if (!counterpartyName && counterparty?.accountType === 'business') {
    counterpartyName = counterparty?.profile?.business?.legalBusinessName
  } else if (!counterpartyName && counterparty?.accountType === 'individual' && counterparty?.profile?.individual) {
    counterpartyName = `${constructFullName(
      counterparty.profile.individual.name.firstName,
      counterparty.profile.individual.name.lastName,
      counterparty.profile.individual.name.middleName,
      counterparty.profile.individual.name.suffix,
    )}`
  }

  useEffect(() => {
    setValue('vendor.id', counterparty?.id)
    setValue('vendor.accountType', counterparty?.accountType)
    setValue('vendor.name', counterpartyName)
    setValue('vendor.firstName', counterparty?.profile?.individual?.name?.firstName)
    setValue('vendor.lastName', counterparty?.profile?.individual?.name?.lastName)
    setValue('vendor.middleName', counterparty?.profile?.individual?.name?.middleName)
    setValue('vendor.suffix', counterparty?.profile?.individual?.name?.suffix)
    setValue(
      'vendor.email',
      counterparty?.accountType === 'business'
        ? counterparty?.profile?.business?.email
        : counterparty?.profile?.individual?.email,
    )
    setValue('vendor.website', counterparty?.profile?.business?.website)
    setValue('vendor.description', counterparty?.profile?.business?.description)
  }, [counterparty])

  const accountType = watch('vendor.accountType')
  const nameInput = watch('vendor.name')

  useEffect(() => {
    if (!nameInput && !accountType) return
    if (accountType === 'business') {
      setValue('vendor.firstName', 'business')
      setValue('vendor.lastName', 'business')
    } else {
      const { firstName, suffix, lastName, middleName } = human.parseName(nameInput)
      setValue('vendor.firstName', firstName)
      setValue('vendor.lastName', lastName)
      setValue('vendor.middleName', middleName)
      setValue('vendor.suffix', suffix)
    }
  }, [nameInput, accountType])

  return (
    <>
      <button
        type="button"
        className="mercoa-absolute mercoa-top-2 mercoa-right-2"
        onClick={() => {
          onComplete(undefined)
          if (counterparty?.id === 'new' && onExit) {
            onExit({
              id: '',
            })
          }
        }}
      >
        <XMarkIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />
        <span className="mercoa-sr-only">Close</span>
      </button>
      <MercoaInput
        label="Name"
        name="vendor.name"
        register={register}
        placeholder="Name"
        errors={errors}
        leadingIcon={<UserIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />}
        className="mercoa-mt-1"
      />
      <MercoaInput
        label="Email"
        name="vendor.email"
        register={register}
        placeholder="Email"
        errors={errors}
        leadingIcon={<EnvelopeIcon className="mercoa-size-5 mercoa-text-gray-400" aria-hidden="true" />}
        className="mercoa-mt-1"
      />

      <div className="mercoa-mt-1 mercoa-mt-2 mercoa-flex mercoa-space-x-2">
        <button
          type="button"
          onClick={() => setValue('vendor.accountType', 'individual')}
          className={`mercoa-flex-grow mercoa-rounded-mercoa mercoa-border mercoa-border-gray-300 mercoa-text-center mercoa-text-gray-600
            ${accountType === 'individual' ? 'mercoa-border-mercoa-primary mercoa-text-gray-800' : ''} 
            ${accountType === 'business' ? 'mercoa-text-gray-300' : ''} 
          mercoa-cursor-pointer mercoa-bg-white mercoa-px-6 mercoa-py-5 mercoa-shadow-sm hover:mercoa-border-mercoa-primary hover:mercoa-text-gray-800`}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => setValue('vendor.accountType', 'business')}
          className={`mercoa-flex-grow mercoa-rounded-mercoa mercoa-border mercoa-border-gray-300 mercoa-text-center mercoa-text-gray-600
            ${accountType === 'business' ? 'mercoa-border-mercoa-primary mercoa-text-gray-800' : ''} 
            ${accountType === 'individual' ? 'mercoa-text-gray-300' : ''} 
          mercoa-cursor-pointer  mercoa-bg-white mercoa-px-6 mercoa-py-5 mercoa-shadow-sm hover:mercoa-border-mercoa-primary hover:mercoa-text-gray-800`}
        >
          Business
        </button>
      </div>

      {accountType === 'business' && (
        <>
          <MercoaInput
            label="Business Website"
            name="vendor.website"
            register={register}
            placeholder="https://www.example.com"
            errors={errors}
            className="mercoa-mt-1"
          />
          <MercoaInput
            label="Business Description"
            name="vendor.description"
            register={register}
            errors={errors}
            className="mercoa-mt-1"
          />
        </>
      )}

      {accountType === 'individual' && (
        <div className="mercoa-mt-1">
          <label
            htmlFor="email"
            className="mercoa-block mercoa-text-left mercoa-text-sm mercoa-font-medium mercoa-text-gray-700"
          >
            Full Name
          </label>
          <div className="mercoa-grid mercoa-grid-cols-7 mercoa-gap-1">
            <input
              type="text"
              {...register('vendor.firstName')}
              required
              className={`mercoa-col-span-2 ${inputClassName({})}`}
              placeholder="First Name"
            />
            <input
              type="text"
              {...register('vendor.middleName')}
              className={`mercoa-col-span-2 ${inputClassName({})}`}
              placeholder="Middle Name"
            />
            <input
              type="text"
              {...register('vendor.lastName')}
              required
              className={`mercoa-col-span-2 ${inputClassName({})}`}
              placeholder="Last Name"
            />
            <select {...register('vendor.suffix')} className={inputClassName({})}>
              <option value=""></option>
              <option value="Sr.">Sr.</option>
              <option value="Jr.">Jr.</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
            </select>
          </div>
        </div>
      )}
      {accountType && (
        <MercoaButton
          isEmphasized
          type="submit"
          className="mercoa-mt-2 mercoa-w-full"
          onClick={() => {
            setValue('saveAsStatus', 'COUNTERPARTY')
          }}
        >
          Save
        </MercoaButton>
      )}
    </>
  )
}

export type CounterpartiesChildrenProps = {
  setSearch: (search: string) => void
  dataLoaded: boolean
  hasNext: boolean
  getNext: () => void
  hasPrevious: boolean
  getPrevious: () => void
  resultsPerPage: number
  setResultsPerPage: (value: number) => void
  counterparties: Mercoa.CounterpartyResponse[]
}

export function Counterparties({
  type,
  admin,
  children,
}: {
  type: 'payor' | 'payee'
  admin?: boolean
  children?: ({
    setSearch,
    dataLoaded,
    hasNext,
    getNext,
    hasPrevious,
    getPrevious,
    resultsPerPage,
    setResultsPerPage,
    counterparties,
  }: CounterpartiesChildrenProps) => JSX.Element
}) {
  const mercoaSession = useMercoaSession()
  const [entities, setEntities] = useState<Mercoa.CounterpartyResponse[] | undefined>(undefined)
  const [addCounterparty, setAddCounterparty] = useState(false)
  const [startingAfter, setStartingAfter] = useState<string[]>([])
  const [page, setPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [resultsPerPage, setResultsPerPage] = useState<number>(20)
  const [count, setCount] = useState<number>(0)

  const [name, setName] = useState<string>()
  const [selected, setSelected] = useState<Mercoa.CounterpartyResponse | undefined>(undefined)

  useEffect(() => {
    if (!mercoaSession.client || !mercoaSession.entityId) return
    let isCurrent = true
    if (type === 'payor') {
      mercoaSession.client.entity.counterparty
        .findPayors(mercoaSession.entityId, {
          limit: resultsPerPage,
          startingAfter: startingAfter[startingAfter.length - 1],
          ...(name && { name }),
          paymentMethods: true,
          invoiceMetrics: true,
        })
        .then((entities) => {
          if (entities && isCurrent) {
            setEntities(entities.data)
            setHasMore(entities.hasMore)
            setCount(entities.count)
          }
        })
    } else {
      mercoaSession.client.entity.counterparty
        .findPayees(mercoaSession.entityId, {
          limit: resultsPerPage,
          startingAfter: startingAfter[startingAfter.length - 1],
          ...(name && { name }),
          paymentMethods: true,
          invoiceMetrics: true,
        })
        .then((entities) => {
          if (entities && isCurrent) {
            setEntities(entities.data)
            setHasMore(entities.hasMore)
            setCount(entities.count)
          }
        })
    }
    return () => {
      isCurrent = false
    }
  }, [mercoaSession.client, mercoaSession.entityId, mercoaSession.refreshId, type, startingAfter, name])

  if (children) {
    return children({
      setSearch: (e) => {
        setName(e)
        setPage(1)
        setStartingAfter([])
      },
      dataLoaded: !!entities,
      hasNext: hasMore,
      getNext: () => {
        if (!entities) return
        setPage(page + 1)
        setStartingAfter([...startingAfter, entities[entities.length - 1].id])
      },
      hasPrevious: page !== 1,
      getPrevious: () => {
        setPage(Math.max(1, page - 1))
        setStartingAfter(startingAfter.slice(0, startingAfter.length - 1))
      },
      resultsPerPage,
      setResultsPerPage,
      counterparties: entities ?? [],
    })
  }

  function CounterpartyRow({
    entity,
    index,
    type,
    setSelected,
    selectedId,
    admin,
  }: {
    entity: Mercoa.CounterpartyResponse
    index: number
    type: 'payor' | 'payee'
    setSelected: (entity?: Mercoa.CounterpartyResponse) => void
    selectedId?: Mercoa.EntityId
    admin?: boolean
  }) {
    const mercoaSession = useMercoaSession()

    if (selectedId === entity.id) {
      return (
        <tr key={entity.id} className={`hover:mercoa-bg-gray-100 ${index % 2 === 0 ? undefined : 'mercoa-bg-gray-50'}`}>
          <td className="mercoa-p-10 mercoa-bg-gray-200" colSpan={admin ? 4 : 3}>
            <div className="mercoa-rounded-mercoa mercoa-bg-gray-50 mercoa-shadow mercoa-ring-1 mercoa-ring-gray-900/5">
              <CounterpartyDetails counterparty={entity} admin={admin} type={type} />
            </div>
          </td>
        </tr>
      )
    }

    return (
      <tr
        key={entity.id}
        className={`hover:mercoa-bg-gray-100 mercoa-cursor-pointer  ${
          index % 2 === 0 ? undefined : 'mercoa-bg-gray-50'
        }`}
        onClick={() => {
          setSelected(entity)
        }}
      >
        <td className="mercoa-whitespace-nowrap mercoa-py-4 mercoa-pl-4 mercoa-pr-3 mercoa-text-sm mercoa-font-medium mercoa-text-gray-900 sm:mercoa-pl-6">
          {entity.name}
        </td>
        <td className="mercoa-whitespace-nowrap mercoa-px-3 mercoa-py-4 mercoa-text-sm mercoa-text-gray-900">
          {entity.email}
        </td>
        <td className="mercoa-whitespace-nowrap mercoa-px-3 mercoa-py-4 mercoa-text-sm mercoa-text-gray-900">
          {capitalize(entity.accountType)}
        </td>
        {admin && (
          <td className="mercoa-whitespace-nowrap mercoa-px-3 mercoa-py-4 mercoa-text-sm mercoa-text-gray-900">
            <MercoaButton
              isEmphasized={false}
              color="red"
              size="sm"
              onClick={async () => {
                if (!mercoaSession.entityId) return
                if (type === 'payor') {
                  await mercoaSession.client?.entity.counterparty.hidePayors(mercoaSession.entityId, {
                    payors: [entity.id],
                  })
                } else {
                  await mercoaSession.client?.entity.counterparty.hidePayees(mercoaSession.entityId, {
                    payees: [entity.id],
                  })
                }
                mercoaSession.refresh()
              }}
            >
              Hide
            </MercoaButton>
          </td>
        )}
      </tr>
    )
  }

  if (!mercoaSession.client) return <NoSession componentName="Counterparties" />
  return (
    <div className="mercoa-overflow-hidden mercoa-shadow mercoa-ring-1 mercoa-ring-black mercoa-ring-opacity-5 md:mercoa-rounded-mercoa mercoa-p-5">
      <div className="mercoa-flex mercoa-mb-5 mercoa-space-x-5 mercoa-items-center">
        <h2 className="mercoa-text-base mercoa-font-semibold mercoa-leading-7 mercoa-text-gray-900">
          {type === 'payor' ? 'Customers' : 'Vendors'}
        </h2>
        <DebouncedSearch
          placeholder={`Search ${type === 'payor' ? 'Customers' : 'Vendors'}`}
          onSettle={(name) => {
            setName(name)
            setPage(1)
            setStartingAfter([])
          }}
        />
        {(admin || !mercoaSession.iframeOptions?.options?.vendors?.disableCreation) && (
          <MercoaButton
            isEmphasized
            type="button"
            className="mercoa-ml-2 mercoa-inline-flex mercoa-text-sm"
            onClick={() => {
              setAddCounterparty(true)
            }}
          >
            <PlusIcon className="-mercoa-ml-1 mercoa-inline-flex mercoa-size-5 md:mercoa-mr-2" />{' '}
            <span className="mercoa-hidden md:mercoa-inline-block mercoa-whitespace-nowrap">
              Add {type === 'payee' ? 'Vendor' : 'Customer'}
            </span>
          </MercoaButton>
        )}
      </div>
      <table className="mercoa-min-w-full mercoa-divide-y mercoa-divide-gray-300">
        <thead className="mercoa-bg-gray-50">
          <tr>
            <th
              scope="col"
              className="mercoa-py-3.5 mercoa-pl-4 mercoa-pr-3 mercoa-text-left mercoa-text-sm mercoa-font-semibold mercoa-text-gray-900 sm:mercoa-pl-6"
            >
              Name
            </th>
            <th
              scope="col"
              className="mercoa-px-3 mercoa-py-3.5 mercoa-text-left mercoa-text-sm mercoa-font-semibold mercoa-text-gray-900"
            >
              Email
            </th>
            <th
              scope="col"
              className="mercoa-px-3 mercoa-py-3.5 mercoa-text-left mercoa-text-sm mercoa-font-semibold mercoa-text-gray-900"
            >
              Type
            </th>
            {admin && (
              <th>
                <span className="mercoa-sr-only">Hide</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="mercoa-bg-white">
          {!entities && (
            <tr>
              <td colSpan={5} className="mercoa-p-9 mercoa-text-center">
                <LoadingSpinnerIcon />
              </td>
            </tr>
          )}
          {entities &&
            entities.map((entity, index) => (
              <CounterpartyRow
                key={entity.id}
                entity={entity}
                index={index}
                type={type}
                setSelected={setSelected}
                selectedId={selected?.id}
                admin={admin}
              />
            ))}
        </tbody>
      </table>
      {entities && (
        <TableNavigation
          data={entities}
          page={page}
          setPage={setPage}
          hasMore={hasMore}
          startingAfter={startingAfter}
          setStartingAfter={setStartingAfter}
          count={count}
          resultsPerPage={resultsPerPage}
          setResultsPerPage={setResultsPerPage}
        />
      )}

      <AddCounterpartyModal type={type} show={addCounterparty} setShow={setAddCounterparty} />
    </div>
  )
}

export function CounterpartyDetails({
  counterparty,
  counterpartyId,
  admin,
  type,
  children,
}: {
  counterparty?: Mercoa.CounterpartyResponse
  counterpartyId?: Mercoa.EntityId
  admin?: boolean
  type: 'payor' | 'payee'
  children?: ({
    counterparty,
    invoices,
  }: {
    counterparty?: Mercoa.CounterpartyResponse
    invoices?: Mercoa.InvoiceResponse[]
  }) => JSX.Element
}) {
  const mercoaSession = useMercoaSession()

  const [isEditing, setIsEditing] = useState<boolean>(false)

  const [invoiceHistory, setInvoiceHistory] = useState<Mercoa.InvoiceResponse[] | undefined>(undefined)
  const [counterpartyLocal, setCounterparty] = useState<Mercoa.CounterpartyResponse | undefined>(counterparty)

  // If counterparty ID is passed in, get counterparty
  useEffect(() => {
    if (!mercoaSession.client || !mercoaSession.entityId || !counterpartyId) return
    if (counterparty || counterpartyLocal) return
    let isCurrent = true
    if (type === 'payee') {
      mercoaSession.client.entity.counterparty
        .findPayees(mercoaSession.entityId, {
          counterpartyId,
        })
        .then((resp) => {
          if (resp && resp.data[0] && isCurrent) {
            setCounterparty(resp.data[0])
            isCurrent = false
          }
        })
    } else {
      mercoaSession.client.entity.counterparty
        .findPayors(mercoaSession.entityId, {
          counterpartyId,
        })
        .then((resp) => {
          if (resp && resp.data[0] && isCurrent) {
            setCounterparty(resp.data[0])
            isCurrent = false
          }
        })
    }
  }, [
    mercoaSession.client,
    mercoaSession.entityId,
    mercoaSession.refreshId,
    counterpartyId,
    counterparty,
    counterpartyLocal,
  ])

  // get historical invoices
  useEffect(() => {
    if (!mercoaSession.client || !mercoaSession.entityId || !counterpartyLocal) return
    let isCurrent = true
    mercoaSession.client.entity.invoice
      .find(mercoaSession.entityId, {
        vendorId: type == 'payee' ? counterpartyLocal.id : undefined,
        payerId: type == 'payor' ? counterpartyLocal.id : undefined,
        limit: 100, // TODO: pagination
      })
      .then((invoices) => {
        if (invoices && isCurrent) {
          setInvoiceHistory(invoices.data)
          isCurrent = false
        }
      })
  }, [mercoaSession.client, mercoaSession.entityId, mercoaSession.refreshId, counterpartyLocal, type])

  if (children) {
    return children({ counterparty: counterpartyLocal, invoices: invoiceHistory ?? [] })
  }

  if (!mercoaSession.client) return <NoSession componentName="CounterpartyDetails" />

  if (!counterpartyLocal) return <LoadingSpinnerIcon />

  const phoneNumber =
    counterpartyLocal.profile?.business?.phone?.number ?? counterpartyLocal.profile?.individual?.phone?.number
  const countryCode =
    counterpartyLocal.profile?.business?.phone?.countryCode ??
    counterpartyLocal.profile?.individual?.phone?.countryCode ??
    '1'
  const phone = `+${countryCode} ${phoneNumber}`
  const address = counterpartyLocal.profile?.business?.address ?? counterpartyLocal.profile?.individual?.address
  const addressString = `${address?.addressLine1 ?? ''} ${address?.addressLine2 ?? ''}, ${address?.city ?? ''}, ${
    address?.stateOrProvince ?? ''
  } ${address?.postalCode ?? ''}`

  function PaymentMethodCard({ method }: { method: Mercoa.PaymentMethodResponse }) {
    let card = <></>
    if (method.type === Mercoa.PaymentMethodType.BankAccount) {
      card = <BankAccount account={method} />
    } else if (method.type === Mercoa.PaymentMethodType.Card) {
      card = <Card account={method} />
    } else if (method.type === Mercoa.PaymentMethodType.Custom) {
      card = <CustomPaymentMethod account={method} />
    } else if (method.type === Mercoa.PaymentMethodType.Check) {
      card = <Check account={method} />
    }
    return (
      <div key={method.id}>
        {admin && (
          <>
            <p className="mercoa-text-xs mercoa-font-bold mercoa-whitespace-nowrap">{method.type}</p>
            <p className="mercoa-text-xs mercoa-whitespace-nowrap">{method.id}</p>
          </>
        )}
        {card}
      </div>
    )
  }

  if (isEditing && mercoaSession.organization) {
    return (
      <div className="mercoa-p-6 ">
        <EntityOnboardingForm
          entity={counterpartyLocal}
          type={type}
          onCancel={() => {
            setIsEditing(false)
          }}
        />
      </div>
    )
  } else {
    return (
      <div className="mercoa-py-6 ">
        <div className="mercoa-flex mercoa-flex-auto mercoa-px-6 mercoa-items-center">
          <dt className="mercoa-sr-only"> {type === 'payor' ? 'Customer' : 'Vendor'} Name</dt>
          <div>
            <dd className="mercoa-text-2xl mercoa-font-semibold mercoa-leading-6 mercoa-text-gray-900 mercoa-inline">
              {counterpartyLocal.profile?.business && counterparty?.profile.business?.legalBusinessName}
              {counterpartyLocal.profile?.individual &&
                `${constructFullName(
                  counterpartyLocal.profile?.individual?.name?.firstName,
                  counterpartyLocal.profile?.individual?.name?.lastName,
                  counterpartyLocal.profile?.individual?.name?.middleName,
                  counterpartyLocal.profile?.individual?.name?.suffix,
                )}`}
            </dd>
            {admin && (
              <div className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-400 mercoa-select-all">
                {counterpartyLocal.id}
              </div>
            )}
          </div>
          <div className="mercoa-flex-grow"></div>
          <Tooltip
            title={`Get a link for the ${type === 'payor' ? 'Customer' : 'Vendor'} to fill out their own information`}
          >
            <MercoaButton
              isEmphasized={false}
              size="sm"
              className="mercoa-ml-5"
              onClick={async () => {
                if (!mercoaSession.entityId) return
                let url
                if (type === 'payor') {
                  url = await mercoaSession.client?.entity.getOnboardingLink(counterpartyLocal.id, {
                    expiresIn: '30d',
                    type: Mercoa.EntityOnboardingLinkType.Payor,
                  })
                } else {
                  url = await mercoaSession.client?.entity.getOnboardingLink(counterpartyLocal.id, {
                    expiresIn: '30d',
                    type: Mercoa.EntityOnboardingLinkType.Payee,
                  })
                }
                if (url) {
                  navigator.clipboard.writeText(url).then(
                    function () {
                      toast.info('Link Copied')
                    },
                    function (err) {
                      toast.error('There was an issue generating the onboarding link. Please refresh and try again.')
                    },
                  )
                } else {
                  toast.error('There was an issue generating the onboarding link. Please refresh and try again.')
                  mercoaSession.refresh()
                }
                mercoaSession.refresh()
              }}
            >
              Onboarding Link
            </MercoaButton>
          </Tooltip>
        </div>

        <div className="mercoa-flex mercoa-flex-auto mercoa-pl-6 mercoa-pt-6 mercoa-items-center">
          <dd className="mercoa-text-lg mercoa-font-semibold mercoa-leading-6 mercoa-text-gray-600 mercoa-inline">
            {type === 'payor' ? 'Customer' : 'Vendor'} Details
          </dd>
        </div>
        {counterpartyLocal.email && (
          <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-border-t mercoa-border-gray-900/5 mercoa-mt-3 mercoa-pt-2">
            <dt className="mercoa-flex-none">
              <span className="mercoa-sr-only">Email</span>
              <EnvelopeIcon className="mercoa-h-6 mercoa-w-5 mercoa-text-gray-500" aria-hidden="true" />
            </dt>
            <dd className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-700 mercoa-select-all">
              <a
                className="mercoa-text-sm mercoa-font-medium mercoa-leading-3 mercoa-text-blue-400"
                href={`mailto:${counterpartyLocal.email}`}
              >
                {counterpartyLocal.email}
              </a>
            </dd>
          </div>
        )}
        {phoneNumber && (
          <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-mt-1">
            <dt className="mercoa-flex-none">
              <span className="mercoa-sr-only">Phone</span>
              <DevicePhoneMobileIcon className="mercoa-h-6 mercoa-w-5 mercoa-text-gray-500" aria-hidden="true" />
            </dt>
            <dd className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-700 mercoa-select-all">
              <a
                className="mercoa-text-sm mercoa-font-medium mercoa-leading-3 mercoa-text-blue-400"
                href={`tel:${phone}`}
              >
                {phone}
              </a>
            </dd>
          </div>
        )}
        {address?.addressLine1 && (
          <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-mt-1">
            <dt className="mercoa-flex-none">
              <span className="mercoa-sr-only">Address</span>
              <MapPinIcon className="mercoa-h-6 mercoa-w-5 mercoa-text-gray-500" aria-hidden="true" />
            </dt>
            <dd className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-700 mercoa-select-all">
              <a
                className="mercoa-text-sm mercoa-font-medium mercoa-leading-3 mercoa-text-blue-400"
                href={`https://www.google.com/maps/search/?api=1&query=${addressString}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {addressString}
              </a>
            </dd>
          </div>
        )}
        {counterparty?.profile.business?.taxIdProvided && (
          <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-mt-1">
            <dt className="mercoa-flex-none">
              <span className="mercoa-sr-only">EIN</span>
              <ShieldCheckIcon className="mercoa-h-6 mercoa-w-5 mercoa-text-gray-500" aria-hidden="true" />
            </dt>
            <dd className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-700 mercoa-select-all">EIN: **-*******</dd>
          </div>
        )}
        {counterparty?.profile.individual?.governmentIdProvided && (
          <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-mt-1">
            <dt className="mercoa-flex-none">
              <span className="mercoa-sr-only">SSN</span>
              <ShieldCheckIcon className="mercoa-h-6 mercoa-w-5 mercoa-text-gray-500" aria-hidden="true" />
            </dt>
            <dd className="mercoa-text-sm mercoa-leading-6 mercoa-text-gray-700 mercoa-select-all">SSN: ***-**-****</dd>
          </div>
        )}

        <div className="mercoa-flex mercoa-w-full mercoa-flex-none mercoa-gap-x-2 mercoa-px-6 mercoa-mt-3">
          <MercoaButton
            size="sm"
            isEmphasized={false}
            onClick={() => {
              setIsEditing(true)
            }}
          >
            Edit Details
          </MercoaButton>
        </div>

        <div className="mercoa-flex mercoa-flex-auto mercoa-pl-6 mercoa-pt-6 mercoa-items-center">
          <dd className="mercoa-text-lg mercoa-font-semibold mercoa-leading-6 mercoa-text-gray-600 mercoa-inline">
            {type === 'payor' ? 'Customer' : 'Vendor'} Payment Methods
          </dd>
        </div>

        <div className="mercoa-flex mercoa-flex-auto mercoa-pl-6 mercoa-mt-2 mercoa-pt-2 mercoa-items-center  mercoa-border-t mercoa-border-gray-900/5 ">
          <dd className="mercoa-text-base mercoa-font-semibold mercoa-leading-6 mercoa-text-gray-600 mercoa-inline">
            ACH
          </dd>
        </div>
        <div className="mercoa-grid mercoa-grid-cols-3 mercoa-gap-2 mercoa-ml-4 mercoa-p-2">
          {counterpartyLocal?.paymentMethods
            ?.filter((e) => e.type === Mercoa.PaymentMethodType.BankAccount)
            ?.map((method) => <PaymentMethodCard method={method} key={method.id} />)}
        </div>
        <div className="mercoa-flex mercoa-flex-auto mercoa-pl-6 mercoa-mt-2 mercoa-pt-2 mercoa-items-center  mercoa-border-t mercoa-border-gray-900/5 ">
          <dd className="mercoa-text-base mercoa-font-semibold mercoa-leading-6 mercoa-text-gray-600 mercoa-inline">
            Check
          </dd>
        </div>
        <div className="mercoa-grid mercoa-grid-cols-3 mercoa-gap-2 mercoa-ml-4 mercoa-p-2">
          {counterpartyLocal?.paymentMethods
            ?.filter((e) => e.type === Mercoa.PaymentMethodType.Check)
            ?.map((method) => <PaymentMethodCard method={method} key={method.id} />)}
        </div>

        <div className="mercoa-flex mercoa-flex-auto mercoa-pl-6 mercoa-mt-2 mercoa-pt-2 mercoa-items-center mercoa-border-t mercoa-border-gray-900/5 " />
        <div className="mercoa-grid mercoa-grid-cols-3 mercoa-gap-2 mercoa-ml-4 mercoa-p-2">
          {counterpartyLocal?.paymentMethods
            ?.filter((e) => e.type === Mercoa.PaymentMethodType.Custom)
            ?.map((method) => <PaymentMethodCard method={method} key={method.id} />)}
        </div>
      </div>
    )
  }
}
