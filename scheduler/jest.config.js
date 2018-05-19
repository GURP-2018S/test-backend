module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "(/test/.*|(\\.|/)(test|spec))\\.tsx?$",
  roots: ["test", "src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
