// Eyes Opener: What this build of IOpener includes on top of the core.
/**
 * What this build of IOpener includes on top of the core.
 * The public edition includes none of it: every switch is off. A fuller build replaces this one file.
 * Plain values only: this file is read on the server and in the browser.
 */
export const edition = {
  /** The stories at /stories and their studio in the staff console. */
  stories: false as boolean,
  /** The staff research pages (camera, depth, photo screen) and their room in the staff console. */
  research: false as boolean,
};

/** True when a link leads somewhere this edition has. Menus, footers and the sitemap pass their links through it. */
export const inEdition = (href: string) => edition.stories || !(href === "/stories" || href.startsWith("/stories/"));
