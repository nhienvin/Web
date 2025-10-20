// Allow importing global CSS files for their side effects.
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
