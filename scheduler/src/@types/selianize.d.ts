declare namespace Selianize {
  export type UUID = string;
  export type CommandName = string;
  export type Code = string;

  export interface Project {
    id: UUID;
    name: string;
    url: string;
    tests: Test[];
    suites: Suite[];
    urls: string[];
  }

  export interface Suite {
    id: UUID;
    name: string;
    tests: string[];
  }

  export interface Test {
    id: UUID;
    name: string;
    commands: Command[];
  }

  export interface Command {
    id: UUID;
    comment: string;
    command: CommandName;
    target: string;
    value: string;
  }
}

declare module "selianize" {
  function Selianize(project: Selianize.Project): Promise<Selianize.Code>;

  export default Selianize;
}
