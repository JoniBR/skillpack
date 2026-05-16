Goals: Create  a new type of agent skills sets and plugin (claude code, pi) that provide automatic boilerplating for agents so they can focus on the core logic and not setup.
Example:
user : generate a webapp with 3d globe where when you hover over a country it start firworks in the colors of the countries flag.
agent: /sandpack react threejs confetti 
- what happens - 
a react boilerplate is generated with threejs and confetti libraries installed . 
The agent gets the project strucute and skills mds to start. 
(we will need to eval tokens used and time with and without)

- sandpacks should have hirarchy - boilerpalte by framework/lib with skills under it 
fe. 
- react
  - threejs
  - confetti
nextjs 
  - auth
  - prisma

skills to create:
- skills-migratetor - a skill that migrates a general agent skill to a sandpack skill , either placing it under a specific boilerplate or creating a new one if it doesn't exist.
skill-creator - a skill that creates a new sandpack skill from user input, allowing users to easily add new skills to their sandpacks without needing to manually code them.



open questions:
- where are plugins stored? agent input / tmp dir / user initail setup
- do we auto detect npm/bun/yarn/pnpm and install and use the right one?
