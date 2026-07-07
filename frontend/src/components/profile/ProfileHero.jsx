function ProfileHero({ greeting }) {
  return (
    <header className="profile-hero">
      <p className="profile-hero__eyebrow">Tài khoản cá nhân</p>
      <h1 className="profile-hero__title">{greeting.title}</h1>
      <p className="profile-hero__subtitle">{greeting.subtitle}</p>
    </header>
  )
}

export default ProfileHero
