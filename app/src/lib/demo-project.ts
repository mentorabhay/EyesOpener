/**
 * Whether a server may offer the demo sign-in, by the name of its sign-in project (audit S2): none at all (a
 * developer's computer), one named for staging, development or tests, or an emulator's "demo-" project. A live
 * project never, whatever DEMO_LOGIN says.
 */
export const demoProjectOk = (project: string | undefined) =>
  !project || /(^|-)(staging|dev|test)$/.test(project) || project.startsWith("demo-");
