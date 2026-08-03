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
   * Off while the Travel / End Trip fixes ship on their own. These five move
   * together on purpose: the daily report and the labour reports are built on
   * top of sites and labour, so releasing them without the screens that create
   * that data would leave dead ends rather than a smaller feature.
   *
   * To re-enable: set this to true. No other change is needed.
   */
  labourManagement: false,
};
