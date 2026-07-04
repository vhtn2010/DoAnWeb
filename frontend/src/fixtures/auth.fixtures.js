export const authUserFixtures = [
  {
    id: 'auth-user-customer-001',
    full_name: 'Nguyen Hoang Linh',
    email: 'customer@netviet.travel',
    phone: '0901234567',
    password: 'NetViet123',
    role: 'customer',
    status: 'active',
  },
  {
    id: 'auth-user-customer-002',
    full_name: 'Tran Minh Chau',
    email: 'minhchau@netviet.travel',
    phone: '0912345678',
    password: 'NetViet456',
    role: 'customer',
    status: 'active',
  },
]

export const authResetFixtures = [
  {
    email: 'customer@netviet.travel',
    otp_code: '1234',
    expires_in_seconds: 300,
  },
]
