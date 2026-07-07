function ProfileHero({ greeting }) {
  return (
    <header className="profile-hero">
      <h1 className="profile-hero__title">{greeting.title}</h1>
      <p className="profile-hero__subtitle">{greeting.subtitle}</p>
    </header>
  )
}

export default ProfileHero
