import CartBenefitCard from './CartBenefitCard.jsx'

const benefitCards = [
  {
    id: 'best-price',
    icon: 'shield',
    title: 'Đảm bảo giá tốt nhất',
    description: 'Hoàn tiền chênh lệch nếu thấy giá rẻ hơn.',
  },
  {
    id: 'support',
    icon: 'support',
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ tận tâm luôn sẵn sàng.',
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
