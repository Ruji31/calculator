const exprEl = document.getElementById("expr");
const valueEl = document.getElementById("value");
const displayEl = document.querySelector(".display");
const MAX_DIGITS = 12;
const MAX_FACTORIAL = 170;
const OPERATORS = ["+", "−", "×", "÷", "^"];
const PRECEDENCE = { "+": 1, "−": 1, "×": 2, "÷": 2, "^": 3 };
const RIGHT_ASSOC = { "^": true };

let tokens = [];
let current = "0";
let overwrite = true;
let justEvaluated = false;

function formatNumber(num) {
  if (num === "Error") return "Error";

  const n = typeof num === "number" ? num : parseFloat(num);
  if (Number.isNaN(n) || !Number.isFinite(n)) return "Error";
  if (n === 0 || Object.is(n, -0)) return "0";

  const rounded = Math.round(n * 1e12) / 1e12;
  if (rounded === 0 || Object.is(rounded, -0)) return "0";

  const abs = Math.abs(rounded);
  if (abs >= 1e12 || abs < 1e-5) return rounded.toExponential(5);
  return String(rounded);
}

function isPlaceholder(value) {
  return value === "0" || value === "00" || value === "-0";
}

function isOperator(token) {
  return OPERATORS.includes(token);
}

function lastToken() {
  return tokens[tokens.length - 1];
}

function normalizeOp(op) {
  if (op === "-") return "−";
  if (op === "*") return "×";
  if (op === "/") return "÷";
  return op;
}

function openParenCount(list) {
  let n = 0;
  for (const token of list) {
    if (token === "(") n += 1;
    else if (token === ")") n -= 1;
  }
  return n;
}

function updateDisplay() {
  exprEl.textContent = tokens.join(" ");
  valueEl.textContent = String(current);
  displayEl.classList.toggle("is-error", current === "Error");

  const len = String(current).length;
  if (len > 14) valueEl.style.fontSize = "22px";
  else if (len > 10) valueEl.style.fontSize = "30px";
  else valueEl.style.fontSize = "44px";

  const pendingOp = overwrite && isOperator(lastToken()) ? lastToken() : "";
  document.querySelectorAll("[data-op]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.op === pendingOp);
  });
}

function checkErrorState() {
  if (current === "Error") clearAll();
}

function beginEntry(digit) {
  if (current === "-0") current = "-" + digit;
  else current = digit;
  overwrite = false;
}

function inputDigit(digit) {
  for (const d of String(digit)) inputSingleDigit(d);
}

function inputSingleDigit(digit) {
  checkErrorState();

  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    overwrite = true;
    current = "0";
  }

  if (lastToken() === ")") tokens.push("×");

  if (overwrite) {
    beginEntry(digit);
    return;
  }

  const cleanLength = current.replace("-", "").replace(".", "").length;
  if (cleanLength >= MAX_DIGITS) return;

  if (current === "0") current = digit;
  else if (current === "-0") current = "-" + digit;
  else current += digit;
}

function inputDot() {
  checkErrorState();

  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    current = "0.";
    overwrite = false;
    return;
  }

  if (lastToken() === ")") tokens.push("×");

  if (overwrite) {
    current = current === "-0" ? "-0." : "0.";
    overwrite = false;
    return;
  }

  if (!current.includes(".")) current += ".";
}

function prepareInsert() {
  checkErrorState();

  if (justEvaluated) {
    tokens = [];
    justEvaluated = false;
    overwrite = true;
    current = "0";
    return;
  }

  // Если текущий ввод завершен (например, число набрано) или последняя была закрывающая скобка
  if (!overwrite) {
    tokens.push(current);
    tokens.push("×");
    overwrite = true;
    current = "0";
    return;
  }

  // Если предыдущий элемент - закрывающая скобка или результат функции/константы
  if (lastToken() === ")" || justEvaluated) {
    tokens.push("×");
  }
}

function inputConstant(type) {
  prepareInsert();
  current = formatNumber(type === "pi" ? Math.PI : Math.E);
  overwrite = true;
  justEvaluated = tokens.length === 0;
}

function applyUnaryFunction(fn) {
  checkErrorState();
  const val = parseFloat(current);
  if (Number.isNaN(val)) return;

  const rad = (val * Math.PI) / 180;
  let res;

  switch (fn) {
    case "sin":
      res = Math.sin(rad);
      break;
    case "cos":
      res = Math.cos(rad);
      break;
    case "tan": {
      const cos = Math.cos(rad);
      res = Math.abs(cos) < 1e-10 ? "Error" : Math.sin(rad) / cos;
      break;
    }
    case "sqrt":
      res = val < 0 ? "Error" : Math.sqrt(val);
      break;
    case "pow2":
      res = val * val;
      break;
    case "log":
      res = val <= 0 ? "Error" : Math.log10(val);
      break;
    case "ln":
      res = val <= 0 ? "Error" : Math.log(val);
      break;
    case "abs":
      res = Math.abs(val);
      break;
    case "1/x":
      res = val === 0 ? "Error" : 1 / val;
      break;
    case "fact":
      if (val < 0 || !Number.isInteger(val) || val > MAX_FACTORIAL)
        res = "Error";
      else {
        let f = 1;
        for (let i = 2; i <= val; i++) f *= i;
        res = f;
      }
      break;
    default:
      return;
  }

  current = formatNumber(res);
  overwrite = true;
  justEvaluated = tokens.length === 0;
}

function toggleSign() {
  checkErrorState();
  if (isPlaceholder(current) && current !== "-0") {
    current = "-0";
    return;
  }
  if (/e/i.test(current)) {
    current = formatNumber(-parseFloat(current));
    overwrite = true;
    return;
  }
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
}

function toPercent() {
  checkErrorState();
  const val = parseFloat(current);
  if (Number.isNaN(val)) return;

  let base = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (isOperator(tokens[i]) || tokens[i] === "(") continue;
    if (tokens[i] === ")") break;
    base = parseFloat(tokens[i]);
    break;
  }

  if (base !== null && !Number.isNaN(base) && isOperator(lastToken())) {
    current = formatNumber(val / 100);
  }
  overwrite = true;
}

function inputOpenParen() {
  prepareInsert();
  tokens.push("(");
  current = "0";
  overwrite = true;
}

function inputCloseParen() {
  checkErrorState();
  if (justEvaluated) return;
  if (openParenCount(tokens) <= 0) return;

  if (!overwrite) {
    tokens.push(current);
    overwrite = true;
  } else if (lastToken() === "(" && !isPlaceholder(current)) {
    tokens.push(current);
  }

  if (isOperator(lastToken()) || lastToken() === "(") return;
  tokens.push(")");
}

function setOperator(nextOp) {
  checkErrorState();
  nextOp = normalizeOp(nextOp);

  if (justEvaluated) {
    tokens = [current];
    justEvaluated = false;
    overwrite = true;
    tokens.push(nextOp);
    return;
  }

  const last = lastToken();

  if (isOperator(last) && overwrite) {
    tokens[tokens.length - 1] = nextOp;
    return;
  }

  if (nextOp === "−" && overwrite && (last === "(" || tokens.length === 0)) {
    current = current.startsWith("-") ? "0" : "-0";
    return;
  }

  if (last === ")") {
    tokens.push(nextOp);
    overwrite = true;
    return;
  }

  tokens.push(current);
  overwrite = true;
  tokens.push(nextOp);
}

function evaluateTokens(list) {
  if (!list.length) return "0";

  const output = [];
  const stack = [];

  for (const token of list) {
    if (token === "(") {
      stack.push(token);
    } else if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }
      if (stack.pop() !== "(") return "Error";
    } else if (isOperator(token)) {
      while (
        stack.length &&
        isOperator(stack[stack.length - 1]) &&
        (RIGHT_ASSOC[token]
          ? PRECEDENCE[stack[stack.length - 1]] > PRECEDENCE[token]
          : PRECEDENCE[stack[stack.length - 1]] >= PRECEDENCE[token])
      ) {
        output.push(stack.pop());
      }
      stack.push(token);
    } else {
      output.push(token);
    }
  }

  while (stack.length) {
    const op = stack.pop();
    if (op === "(" || op === ")") return "Error";
    output.push(op);
  }

  const nums = [];
  for (const token of output) {
    if (!isOperator(token)) {
      const n = parseFloat(token);
      if (Number.isNaN(n)) return "Error";
      nums.push(n);
      continue;
    }
    if (nums.length < 2) return "Error";
    const b = nums.pop();
    const a = nums.pop();
    let result;
    switch (token) {
      case "+":
        result = a + b;
        break;
      case "−":
        result = a - b;
        break;
      case "×":
        result = a * b;
        break;
      case "÷":
        if (b === 0) return "Error";
        result = a / b;
        break;
      case "^":
        result = Math.pow(a, b);
        break;
      default:
        return "Error";
    }
    if (!Number.isFinite(result)) return "Error";
    nums.push(result);
  }

  if (nums.length !== 1) return "Error";
  return formatNumber(nums[0]);
}

function buildExpression() {
  const list = tokens.slice();
  const last = list[list.length - 1];

  if (!list.length) return [current];
  if (isOperator(last) || last === "(") list.push(current);
  else if (!overwrite) list.push(current);

  let balance = openParenCount(list);
  if (balance < 0) return null;
  while (balance > 0) {
    list.push(")");
    balance -= 1;
  }
  return list;
}

function equals() {
  if (current === "Error") {
    clearAll();
    return;
  }

  const list = buildExpression();
  if (!list) {
    current = "Error";
    tokens = [];
    overwrite = true;
    justEvaluated = true;
    return;
  }

  current = evaluateTokens(list);
  tokens = [];
  overwrite = true;
  justEvaluated = true;
}

function backspace() {
  if (current === "Error" || justEvaluated) {
    clearAll();
    return;
  }

  if (!overwrite) {
    if (
      current.length <= 1 ||
      current === "-0" ||
      (current.startsWith("-") && current.length === 2)
    ) {
      current = "0";
      overwrite = true;
      return;
    }
    current = current.slice(0, -1);
    if (current === "-" || current === "") {
      current = "0";
      overwrite = true;
    }
    return;
  }

  if (!tokens.length) return;
  const popped = tokens.pop();
  if (!isOperator(popped) && popped !== "(" && popped !== ")") {
    current = popped;
    overwrite = false;
  }
}

function clearAll() {
  tokens = [];
  current = "0";
  overwrite = true;
  justEvaluated = false;
}

document.querySelector(".keys").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  if (btn.dataset.num !== undefined) inputDigit(btn.dataset.num);
  else if (btn.dataset.op) setOperator(btn.dataset.op);
  else if (btn.dataset.fn) applyUnaryFunction(btn.dataset.fn);
  else if (btn.dataset.const) inputConstant(btn.dataset.const);
  else if (btn.dataset.action === "dot") inputDot();
  else if (btn.dataset.action === "clear") clearAll();
  else if (btn.dataset.action === "backspace") backspace();
  else if (btn.dataset.action === "sign") toggleSign();
  else if (btn.dataset.action === "percent") toPercent();
  else if (btn.dataset.action === "paren-open") inputOpenParen();
  else if (btn.dataset.action === "paren-close") inputCloseParen();
  else if (btn.dataset.action === "equals") equals();

  updateDisplay();
});

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key.length === 1 && /\d/.test(key)) inputDigit(key);
  else if (key === "." || key === ",") inputDot();
  else if (key === "+") setOperator("+");
  else if (key === "-") setOperator("−");
  else if (key === "*") setOperator("×");
  else if (key === "/") {
    event.preventDefault();
    setOperator("÷");
  } else if (key === "^") setOperator("^");
  else if (key === "(") inputOpenParen();
  else if (key === ")") inputCloseParen();
  else if (key === "Enter" || key === "=") {
    event.preventDefault();
    equals();
  } else if (key === "Backspace") {
    event.preventDefault();
    backspace();
  } else if (key === "Escape" || key === "Delete") clearAll();
  else if (key === "%") toPercent();
  else return;

  updateDisplay();
});

updateDisplay();
