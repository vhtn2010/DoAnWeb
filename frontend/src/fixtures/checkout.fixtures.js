import { ROLES } from '../constants/roles.js'
import {
  customerActiveCartFixture,
  guestActiveCartFixture,
} from './cart.fixtures.js'
import {
  buildCheckoutDraftFromCartSnapshot,
} from '../mappers/checkoutMappers.js'
import { CHECKOUT_VOUCHER_DISCOUNT_AMOUNT } from '../constants/checkout.js'

export const checkoutVoucherFixtures = Object.freeze([
  {
    code: 'SUMMER2026',
    discount_amount: CHECKOUT_VOUCHER_DISCOUNT_AMOUNT,
  },
  {
    code: 'NETVIET300',
    discount_amount: CHECKOUT_VOUCHER_DISCOUNT_AMOUNT,
  },
])

export const guestCheckoutDraftFixture = Object.freeze(
  buildCheckoutDraftFromCartSnapshot(guestActiveCartFixture, {
    authState: ROLES.guest,
  }),
)

export const customerCheckoutDraftFixture = Object.freeze(
  buildCheckoutDraftFromCartSnapshot(customerActiveCartFixture, {
    authState: ROLES.customer,
  }),
)

