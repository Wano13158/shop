import json
import os
from pathlib import Path
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

DB_PATH = Path(__file__).with_name('products.json')


def read_products():
    if not DB_PATH.exists():
        DB_PATH.write_text('[]', encoding='utf-8')
    data = json.loads(DB_PATH.read_text(encoding='utf-8'))
    return data if isinstance(data, list) else []


def write_products(products):
    DB_PATH.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding='utf-8')


def format_products(products):
    if not products:
        return 'Список товарів порожній.'
    return '\n\n'.join(
        f"ID: {p['id']}\nНазва: {p['name']}\nЦіна: {p['price']} грн\nКількість: {p['qty']}"
        for p in products
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        'Привіт! Python-бот для замовлень 🛒\n\n'
        'Команди:\n'
        '/list - список товарів\n'
        '/add <id> <ціна> <кількість> <назва>\n'
        '/setqty <id> <кількість>\n'
        '/remove <id>\n'
        '/order <id> <кількість> <імʼя> <номер>'
    )
    await update.message.reply_text(text)


async def list_products(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"📦 Товари:\n\n{format_products(read_products())}")


async def add_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) < 4:
        await update.message.reply_text('Формат: /add <id> <ціна> <кількість> <назва>')
        return
    pid = context.args[0]
    try:
        price = float(context.args[1])
        qty = int(context.args[2])
    except ValueError:
        await update.message.reply_text('Ціна або кількість некоректні.')
        return
    name = ' '.join(context.args[3:]).strip()
    products = read_products()
    if any(p['id'] == pid for p in products):
        await update.message.reply_text(f'Товар з ID {pid} вже існує.')
        return
    products.append({'id': pid, 'name': name, 'price': price, 'qty': qty})
    write_products(products)
    await update.message.reply_text(f'✅ Додано: {name} (ID: {pid})')


async def set_qty(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) != 2:
        await update.message.reply_text('Формат: /setqty <id> <кількість>')
        return
    pid, qty_raw = context.args
    try:
        qty = int(qty_raw)
    except ValueError:
        await update.message.reply_text('Кількість має бути числом.')
        return
    products = read_products()
    product = next((p for p in products if p['id'] == pid), None)
    if not product:
        await update.message.reply_text(f'Товар з ID {pid} не знайдено.')
        return
    product['qty'] = qty
    write_products(products)
    await update.message.reply_text(f'✅ Оновлено залишок: {product["name"]} = {qty}')


async def remove_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) != 1:
        await update.message.reply_text('Формат: /remove <id>')
        return
    pid = context.args[0]
    products = read_products()
    filtered = [p for p in products if p['id'] != pid]
    if len(filtered) == len(products):
        await update.message.reply_text(f'Товар з ID {pid} не знайдено.')
        return
    write_products(filtered)
    await update.message.reply_text(f'🗑️ Товар {pid} видалено.')


async def order_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) < 4:
        await update.message.reply_text('Формат: /order <id> <кількість> <імʼя> <номер>')
        return
    pid = context.args[0]
    try:
        qty = int(context.args[1])
    except ValueError:
        await update.message.reply_text('Кількість має бути числом.')
        return
    phone = context.args[-1]
    customer_name = ' '.join(context.args[2:-1]).strip()
    products = read_products()
    product = next((p for p in products if p['id'] == pid), None)
    if not product:
        await update.message.reply_text(f'Товар з ID {pid} не знайдено.')
        return
    if product['qty'] < qty:
        await update.message.reply_text(f'Недостатньо товару. В наявності: {product["qty"]}')
        return
    product['qty'] -= qty
    write_products(products)
    total = qty * product['price']
    text = (
        '🛍️ НОВЕ ЗАМОВЛЕННЯ\n\n'
        f'ID товару: {product["id"]}\n'
        f'Назва: {product["name"]}\n'
        f'Кількість: {qty}\n'
        f'Сума: {total} грн\n\n'
        '👤 Дані клієнта:\n'
        f'Імʼя: {customer_name}\n'
        f'Номер: {phone}\n\n'
        f'Залишок: {product["qty"]}'
    )
    await update.message.reply_text(text)


def main():
    token = os.getenv('TG_BOT_TOKEN')
    if not token:
        raise RuntimeError('Set TG_BOT_TOKEN env variable')
    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('list', list_products))
    app.add_handler(CommandHandler('add', add_product))
    app.add_handler(CommandHandler('setqty', set_qty))
    app.add_handler(CommandHandler('remove', remove_product))
    app.add_handler(CommandHandler('order', order_product))
    app.run_polling()


if __name__ == '__main__':
    main()
