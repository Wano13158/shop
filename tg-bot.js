const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) {
  throw new Error('Set TG_BOT_TOKEN in environment variables');
}

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null;
const DB_PATH = path.join(__dirname, 'products.json');

const bot = new TelegramBot(TOKEN, { polling: true });

function readProducts() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeProducts(products) {
  fs.writeFileSync(DB_PATH, JSON.stringify(products, null, 2));
}

function formatProducts(products) {
  if (!products.length) return 'Список товарів порожній.';
  return products
    .map(
      p =>
        `ID: ${p.id}\nНазва: ${p.name}\nЦіна: ${p.price} грн\nКількість: ${p.qty}`
    )
    .join('\n\n');
}

function parseArgs(text) {
  return text.trim().split(/\s+/);
}

bot.onText(/^\/start$/, msg => {
  bot.sendMessage(
    msg.chat.id,
    [
      'Привіт! Це бот для керування замовленнями 🛒',
      '',
      'Команди:',
      '/list - список товарів',
      '/add <id> <назва> <ціна> <кількість> - додати товар',
      '/setqty <id> <кількість> - змінити кількість',
      '/order <id> <кількість> <імʼя> <номер> - оформити замовлення',
      '/remove <id> - видалити товар'
    ].join('\n')
  );
});

bot.onText(/^\/list$/, msg => {
  const products = readProducts();
  bot.sendMessage(msg.chat.id, `📦 Товари:\n\n${formatProducts(products)}`);
});

bot.onText(/^\/add\s+(.+)/, (msg, match) => {
  const args = parseArgs(match[1]);
  if (args.length < 4) {
    bot.sendMessage(msg.chat.id, 'Формат: /add <id> <назва> <ціна> <кількість>');
    return;
  }

  const [id, ...rest] = args;
  const qty = Number(rest.pop());
  const price = Number(rest.pop());
  const name = rest.join(' ');

  if (!name || Number.isNaN(price) || Number.isNaN(qty)) {
    bot.sendMessage(msg.chat.id, 'Некоректні дані.');
    return;
  }

  const products = readProducts();
  const exists = products.find(p => p.id === id);
  if (exists) {
    bot.sendMessage(msg.chat.id, `Товар з ID ${id} вже існує.`);
    return;
  }

  products.push({ id, name, price, qty });
  writeProducts(products);
  bot.sendMessage(msg.chat.id, `✅ Додано товар:\nID: ${id}\nНазва: ${name}\nКількість: ${qty}`);
});

bot.onText(/^\/setqty\s+(.+)/, (msg, match) => {
  const [id, qtyText] = parseArgs(match[1]);
  const qty = Number(qtyText);
  if (!id || Number.isNaN(qty) || qty < 0) {
    bot.sendMessage(msg.chat.id, 'Формат: /setqty <id> <кількість>');
    return;
  }

  const products = readProducts();
  const product = products.find(p => p.id === id);
  if (!product) {
    bot.sendMessage(msg.chat.id, `Товар з ID ${id} не знайдено.`);
    return;
  }

  product.qty = qty;
  writeProducts(products);
  bot.sendMessage(msg.chat.id, `✅ Кількість оновлено. ${product.name}: ${qty}`);
});

bot.onText(/^\/remove\s+(.+)/, (msg, match) => {
  const [id] = parseArgs(match[1]);
  const products = readProducts();
  const next = products.filter(p => p.id !== id);

  if (next.length === products.length) {
    bot.sendMessage(msg.chat.id, `Товар з ID ${id} не знайдено.`);
    return;
  }

  writeProducts(next);
  bot.sendMessage(msg.chat.id, `🗑️ Товар з ID ${id} видалено.`);
});

bot.onText(/^\/order\s+(.+)/, (msg, match) => {
  const args = parseArgs(match[1]);
  if (args.length < 4) {
    bot.sendMessage(msg.chat.id, 'Формат: /order <id> <кількість> <імʼя> <номер>');
    return;
  }

  const id = args[0];
  const qty = Number(args[1]);
  const phone = args[args.length - 1];
  const customerName = args.slice(2, -1).join(' ');

  if (!customerName || Number.isNaN(qty) || qty <= 0) {
    bot.sendMessage(msg.chat.id, 'Некоректні дані замовлення.');
    return;
  }

  const products = readProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    bot.sendMessage(msg.chat.id, `Товар з ID ${id} не знайдено.`);
    return;
  }

  if (product.qty < qty) {
    bot.sendMessage(msg.chat.id, `Недостатньо товару. В наявності: ${product.qty}`);
    return;
  }

  product.qty -= qty;
  writeProducts(products);

  const orderText = [
    '🛍️ НОВЕ ЗАМОВЛЕННЯ',
    '',
    `ID товару: ${product.id}`,
    `Назва: ${product.name}`,
    `Кількість: ${qty}`,
    `Сума: ${qty * product.price} грн`,
    '',
    '👤 Дані клієнта:',
    `Імʼя: ${customerName}`,
    `Номер: ${phone}`,
    '',
    `Залишок на складі: ${product.qty}`
  ].join('\n');

  bot.sendMessage(msg.chat.id, `✅ Замовлення оформлено!\n\n${orderText}`);

  if (ADMIN_CHAT_ID) {
    bot.sendMessage(ADMIN_CHAT_ID, orderText);
  }
});

console.log('Telegram bot is running...');
