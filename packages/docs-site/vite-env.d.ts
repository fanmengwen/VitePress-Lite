declare module "virtual:pages" {
  const pages: any;
  export default pages;
}

declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
