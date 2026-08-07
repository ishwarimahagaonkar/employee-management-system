/**
 * Feature switches for work that is built but not ready to ship.
 *
 * Nothing here deletes code. A screen turned off is still compiled, still
 * imported, and still covered by its tests -- the navigator simply routes to
 * "Coming Soon" instead of the real screen. Turning it back on is one boolean.
 */
export const FEATURES = {
  /**
   * Sites, Labour, Labour Attendance, Daily Work Report and Labour Reports.
   *
   * These five move together on purpose: the daily report and the labour
   * reports are built on top of sites and labour, so releasing them without
   * the screens that create that data would leave dead ends rather than a
   * smaller feature.
   *
   * Was off while the Travel / End Trip fixes shipped on their own in 1.1.1.
   * Back on now that labour runs on the company-wide master list -- the site
   * a labourer worked lives on the attendance row, not on the labourer.
   */
  labourManagement: true,
};
