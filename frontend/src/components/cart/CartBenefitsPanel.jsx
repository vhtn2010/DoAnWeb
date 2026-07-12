import CartBenefitCard from './CartBenefitCard.jsx'

const benefitCards = [
  {
    id: 'best-price',
    icon: 'shield',
    title: 'Đảm bảo giá tốt nhất',
    description: 'Hoàn tiền chênh lệch nếu bạn thấy giá tốt hơn.',
  },
  {
    id: 'support',
    icon: 'support',
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ luôn sẵn sàng đồng hành cùng bạn.',
  },
]

export default function CartBenefitsPanel() {
  return (
    <div className="cart-page__benefits">
      {benefitCards.map((benefit) => (
        <CartBenefitCard
          key={benefit.id}
          description={benefit.description}
          icon={benefit.icon}
          title={benefit.title}
        />
      ))}
    </div>
  )
}
