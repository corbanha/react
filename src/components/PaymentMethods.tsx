import { Mercoa } from '@mercoa/javascript'
import { BankAccounts, Cards, CustomPaymentMethods, NoSession, useMercoaSession } from './index'

export function PaymentMethods() {
  const mercoaSession = useMercoaSession()
  if (!mercoaSession.client) return <NoSession componentName="PaymentMethods" />
  return (
    <div>
      {mercoaSession.organization?.paymentMethods?.payerPayments?.find(
        (e) => e.type === Mercoa.PaymentMethodType.BankAccount && e.active,
      ) && (
        <>
          <h3 className="mercoa-mt-8">Bank Accounts</h3>
          <BankAccounts showEdit showAdd />
        </>
      )}
      {mercoaSession.organization?.paymentMethods?.payerPayments?.find(
        (e) => e.type === Mercoa.PaymentMethodType.Card && e.active,
      ) && (
        <>
          <h3 className="mercoa-mt-8">Cards</h3>
          <Cards showEdit showAdd />
        </>
      )}
      {mercoaSession.organization?.paymentMethods?.payerPayments?.find(
        (e) => e.type === Mercoa.PaymentMethodType.Custom && e.active,
      ) && (
        <>
          <h3 className="mercoa-mt-8"></h3>
          <CustomPaymentMethods showEdit />
        </>
      )}
    </div>
  )
}
