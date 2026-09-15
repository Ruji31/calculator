const fs = require("fs");
const vm = require("vm");
const path = require("path");

const display = { classList: { toggle() {} } };
const exprEl = { textContent: "", style: {} };
const valueEl = { textContent: "0", style: {} };

const context = {
  document: {
    getElementById(id) {
      return id === "expr" ? exprEl : valueEl;
    },
    querySelector(sel) {
      if (sel === ".display") return display;
      return { addEventListener() {} };
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  },
  console,
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "script.js"), "utf8"),
  context
);

function reset() {
  context.clearAll();
}

function seq(keys) {
  reset();
  for (const key of keys) {
    if (key === "=") context.equals();
    else if (key === "(") context.inputOpenParen();
    else if (key === ")") context.inputCloseParen();
    else if (key === ".") context.inputDot();
    else if (["+", "−", "×", "÷", "^"].includes(key)) context.setOperator(key);
    else if (/^\d+$/.test(key)) context.inputDigit(key);
    else if (key === "sin") context.applyUnaryFunction("sin");
    else if (key === "sqrt") context.applyUnaryFunction("sqrt");
    else if (key === "pi") context.inputConstant("pi");
    else if (key === "%") context.toPercent();
    else if (key === "AC") context.clearAll();
  }
  context.equals();
  return context.current;
}

const tests = [];
function t(name, got, expected) {
  tests.push({ name, got, expected, ok: String(got) === String(expected) });
}

t("2+3", seq(["2", "+", "3"]), "5");
t("0.1+0.2", seq(["0", ".", "1", "+", "0", ".", "2"]), "0.3");
t("2+3×4", seq(["2", "+", "3", "×", "4"]), "14");
t("(2+3)×4", seq(["(", "2", "+", "3", ")", "×", "4"]), "20");
t("2×(3+4)", seq(["2", "×", "(", "3", "+", "4", ")"]), "14");
t("implicit 2(", seq(["2", "(", "3", "+", "4", ")"]), "14");
t("2^3", seq(["2", "^", "3"]), "8");
t("2^3^2", seq(["2", "^", "3", "^", "2"]), "512");
t("div0", seq(["8", "÷", "0"]), "Error");
t("sin30", seq(["3", "0", "sin"]), "0.5");
t("sqrt9+1", seq(["9", "sqrt", "+", "1"]), "4");
t("5+3=", seq(["5", "+", "3"]), "5".length ? "8" : "8");
t("paren auto close", seq(["(", "2", "+", "3"]), "5");
t("percent 200+10%", () => {
  reset();
  context.inputDigit("2");
  context.inputDigit("0");
  context.inputDigit("0");
  context.setOperator("+");
  context.inputDigit("1");
  context.inputDigit("0");
  context.toPercent();
  context.equals();
  return context.current;
}(), "220");

const failed = tests.filter((x) => !x.ok);
console.log(JSON.stringify({ total: tests.length, failed: failed.length, fails: failed }, null, 2));
process.exit(failed.length ? 1 : 0);
