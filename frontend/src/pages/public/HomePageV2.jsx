import HomeDestinationsSection from '../../components/public/home/HomeDestinationsSection.jsx'
import HomeFlashSaleSection from '../../components/public/home/HomeFlashSaleSection.jsx'
import HomeHeroSection from '../../components/public/home/HomeHeroSection.jsx'
import HomeSearchCard from '../../components/public/home/HomeSearchCard.jsx'
import HomeValuesSectionV2 from '../../components/public/home/HomeValuesSectionV2.jsx'
import useHomePage from '../../hooks/useHomePage.js'

function HomePageV2() {
  const {
    calendarSelection,
    calendarPreview,
    destinations,
    displayedDateRange,
    errorMessage,
    feedbackMessage,
    flashSaleMeta,
    flashSaleServices,
    formatCurrency,
    formatMonthLabel,
    getMonthDays,
    handleDateFieldToggle,
    handleDateClear,
    handleDateSelect,
    handleFieldClear,
    handleFieldSelect,
    handleFilterSelect,
    handleRetry,
    handleSearch,
    handleSortSelect,
    hero,
    heroCtaPath,
    isSameDay,
    loading,
    openMenu,
    searchCardRef,
    searchFieldOptions,
    searchState,
    serviceListPath,
    showNextMonth,
    showPreviousMonth,
    sortOptions,
    toggleMenu,
    valueProps,
    visibleMonths,
    weekdayLabels,
    filterGroups,
  } = useHomePage()

  return (
    <div className="home-page">
      <section className="home-hero">
        <HomeHeroSection
          ctaLabel={hero.cta_label}
          ctaPath={heroCtaPath}
          description={hero.description}
          imageAlt={hero.art_image_alt}
          titleLeading={hero.title_leading}
          titleScript={hero.title_script}
        />

        <HomeSearchCard
          calendarPreview={calendarPreview}
          calendarSelection={calendarSelection}
          displayedDateRange={displayedDateRange}
          errorMessage={errorMessage}
          feedbackMessage={feedbackMessage}
          filterGroups={filterGroups}
          formatMonthLabel={formatMonthLabel}
          getMonthDays={getMonthDays}
          handleDateFieldToggle={handleDateFieldToggle}
          handleDateClear={handleDateClear}
          handleDateSelect={handleDateSelect}
          handleFieldClear={handleFieldClear}
          handleFieldSelect={handleFieldSelect}
          handleFilterSelect={handleFilterSelect}
          handleRetry={handleRetry}
          handleSearch={handleSearch}
          handleSortSelect={handleSortSelect}
          isSameDay={isSameDay}
          loading={loading}
          openMenu={openMenu}
          searchCardRef={searchCardRef}
          searchFieldOptions={searchFieldOptions}
          searchState={searchState}
          showNextMonth={showNextMonth}
          showPreviousMonth={showPreviousMonth}
          sortOptions={sortOptions}
          toggleMenu={toggleMenu}
          visibleMonths={visibleMonths}
          weekdayLabels={weekdayLabels}
        />
      </section>

      <HomeDestinationsSection destinations={destinations} />

      <HomeFlashSaleSection
        flashSaleMeta={flashSaleMeta}
        flashSaleServices={flashSaleServices}
        formatCurrency={formatCurrency}
        serviceListPath={serviceListPath}
      />

      <HomeValuesSectionV2 valueProps={valueProps} />
    </div>
  )
}

export default HomePageV2
