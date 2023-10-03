module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },

  extends: ['eslint:recommended'],
  overrides: [],

  plugins: [],
  rules: {
    indent: [
      // отступы
      'off',
      'tab',
      {
        SwitchCase: 1,
        VariableDeclarator: 'first',
        MemberExpression: 1,
        outerIIFEBody: 1,
        FunctionDeclaration: { parameters: 'first' },
        StaticBlock: { body: 1 },
        CallExpression: { arguments: 1 },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: true,
      },
    ],
    quotes: ['warn', 'single'],
    semi: ['warn', 'never'], //  OFF
    'no-empty-pattern': [0], // разрешаем пустую деструктуризацию "{}"
    'no-unused-vars': [0], // не используемые переменные
    'no-mixed-spaces-and-tabs': [0], // смешивание табов и пробелов , временно
    'max-len': [1, { code: 120, tabWidth: 2, comments: 120 }], // Принудительно установите максимальную длину строки
    // 'import/order': [1], // сорировка импортов
    'comma-dangle': [1, 'always-multiline'], // последняя запятая в массивах ...
    camelcase: [0], // переменные пишутся в стиле camelCase
    curly: [1, 'all'], // запретить if в одну строку
    'no-console': [1], // без консоли "console.log"
    'no-empty': [1], // пустые функции
    'no-floating-decimal': [1], // запретить числа без 0 ".3 -.5"
    'no-implicit-coercion': [1], // явное приведение типов "Number("1")"
    'no-unneeded-ternary': [1], // Запрещайте троичные операторы, когда существуют более простые альтернативы
    'no-useless-computed-key': [1], // Запретить ненужные вычисляемые ключи свойств в объектах и классах "{['name']:1}"
    'prefer-const': [1], // Требовать const объявления для переменных, которые никогда не переназначаются после объявления
    'prefer-template': [1], // Требовать шаблонные литералы вместо конкатенации строк
    'space-in-parens': [1, 'never'], // Обеспечить согласованный интервал внутри круглых скобок
    'space-before-blocks': [1, 'always'], // Обеспечить согласованный интервал перед блоками
    // ! ERROR
    'no-implied-eval': [2], // запретить непреднамеренный eval "setTimeout("alert('Hi!');", 100)"
    eqeqeq: [2], // только 3ое равенство "true === true"
    'no-multi-assign': [2], // запретить множественное присвоение "const foo = bar = 0"
    'default-param-last': [2], // дефолтные парметры функции пишутся в конце
    // 'max-lines': [2, {max: 120, skipBlankLines: true}], // максимальная длина строк в файле
    'no-constant-condition': [0],
  },
}
