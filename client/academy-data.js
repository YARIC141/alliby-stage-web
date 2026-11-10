/* Fictional Academy catalogue; no real business transactions. */
const ACADEMY_DATA = {
  "version": 3,
  "stores": [
    {
      "id": "aca10000-0000-4000-8000-000000000001",
      "name": "Кафе «Вкусный день»",
      "direction": "food",
      "description": "Обед с доставкой",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.195,
      "longitude": 50.105,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": true,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000001",
      "store_categories": {
        "name": "Еда",
        "icon": ""
      },
      "accent": "#e87639"
    },
    {
      "id": "aca10000-0000-4000-8000-000000000002",
      "name": "Магазин «Мастер»",
      "direction": "goods",
      "description": "Покупка и аренда инструментов",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.1957,
      "longitude": 50.1059,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": false,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000002",
      "store_categories": {
        "name": "Товары",
        "icon": ""
      },
      "accent": "#35a862"
    },
    {
      "id": "aca10000-0000-4000-8000-000000000003",
      "name": "студия массажа Alliby",
      "direction": "services",
      "description": "Массаж и специалисты",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.1964,
      "longitude": 50.1068,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": false,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000003",
      "store_categories": {
        "name": "Услуги",
        "icon": ""
      },
      "accent": "#78b4e0"
    },
    {
      "id": "aca10000-0000-4000-8000-000000000004",
      "name": "Клуб «Движение»",
      "direction": "sport",
      "description": "Занятия и тренировки",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.1971,
      "longitude": 50.107699999999994,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": false,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000004",
      "store_categories": {
        "name": "Спорт",
        "icon": ""
      },
      "accent": "#ef4444"
    },
    {
      "id": "aca10000-0000-4000-8000-000000000005",
      "name": "Школа «Диалог»",
      "direction": "education",
      "description": "Индивидуальные уроки",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.1978,
      "longitude": 50.108599999999996,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": false,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000005",
      "store_categories": {
        "name": "Образование",
        "icon": ""
      },
      "accent": "#6366f1"
    },
    {
      "id": "aca10000-0000-4000-8000-000000000006",
      "name": "VR-клуб «Портал»",
      "direction": "entertainment",
      "description": "VR-сеансы",
      "address": "Академия Alliby",
      "city": "Самара",
      "latitude": 53.1985,
      "longitude": 50.1095,
      "is_visible": true,
      "is_academy": true,
      "archived_at": null,
      "owner_user_id": null,
      "timezone": "Europe/Moscow",
      "working_hours": "Ежедневно 09:00–21:00",
      "has_cart": true,
      "accepts_online_payment": true,
      "payment_provider": "none",
      "delivery_enabled": false,
      "delivery_courier_mode": "carry",
      "allow_unpaid_booking": true,
      "preorder_enabled": false,
      "feed": [],
      "socials": {},
      "store_category_id": "aca30000-0000-4000-8000-000000000006",
      "store_categories": {
        "name": "Развлечения",
        "icon": ""
      },
      "accent": "#d0a010"
    }
  ],
  "items": [
    {
      "id": "aca20000-0000-4000-8000-000000000001",
      "store_id": "aca10000-0000-4000-8000-000000000001",
      "category_id": "aca30000-0000-4000-8000-000000000001",
      "name": "Обед: суп, горячее и напиток",
      "price": 490,
      "item_type": "product",
      "description": "Выберите комплект и оформите доставку.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Еда"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000002",
      "store_id": "aca10000-0000-4000-8000-000000000002",
      "category_id": "aca30000-0000-4000-8000-000000000002",
      "name": "Дрель Компакт 18В",
      "price": 3900,
      "item_type": "product",
      "description": "18 В · 45 Н·м · вес 1,3 кг. Лёгкая дрель для домашних работ.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Товары"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": 1300,
      "includes": "1 батарея"
    },
    {
      "id": "aca20000-0000-4000-8000-000000000003",
      "store_id": "aca10000-0000-4000-8000-000000000002",
      "category_id": "aca30000-0000-4000-8000-000000000002",
      "name": "Дрель Мастер 18В",
      "price": 5200,
      "item_type": "product",
      "description": "18 В · 60 Н·м · вес 1,7 кг. Две батареи и кейс в комплекте.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Товары"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": 1700,
      "includes": "2 батареи, кейс"
    },
    {
      "id": "aca20000-0000-4000-8000-000000000004",
      "store_id": "aca10000-0000-4000-8000-000000000002",
      "category_id": "aca30000-0000-4000-8000-000000000002",
      "name": "Перфоратор на день",
      "price": 650,
      "item_type": "rental",
      "description": "Аренда перфоратора: выберите день начала и окончания.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Товары"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "day",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000005",
      "store_id": "aca10000-0000-4000-8000-000000000003",
      "category_id": "aca30000-0000-4000-8000-000000000003",
      "name": "Массаж спины · 45 минут",
      "price": 1800,
      "item_type": "service",
      "description": "Запишитесь к мастеру и проверьте время в деталях записи.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Услуги"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000006",
      "store_id": "aca10000-0000-4000-8000-000000000004",
      "category_id": "aca30000-0000-4000-8000-000000000004",
      "name": "Групповая тренировка · функциональный тренинг",
      "price": 700,
      "item_type": "service",
      "description": "Занятие по расписанию. В группе всегда есть свободные места.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Спорт"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": true,
      "training_mode": "group",
      "max_group_size": 6,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000007",
      "store_id": "aca10000-0000-4000-8000-000000000004",
      "category_id": "aca30000-0000-4000-8000-000000000004",
      "name": "Персональная тренировка в группе до 3 человек",
      "price": 2400,
      "item_type": "service",
      "description": "Подайте заявку с удобным интервалом. тренер согласует время; стоимость делится на участников.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Спорт"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": true,
      "training_mode": "personal",
      "max_group_size": 3,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000008",
      "store_id": "aca10000-0000-4000-8000-000000000005",
      "category_id": "aca30000-0000-4000-8000-000000000005",
      "name": "Пробный урок английского · 45 минут",
      "price": 900,
      "item_type": "service",
      "description": "Индивидуальное занятие с преподавателем.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Образование"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 3,
      "quantity_available": 3,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": null,
      "includes": null
    },
    {
      "id": "aca20000-0000-4000-8000-000000000009",
      "store_id": "aca10000-0000-4000-8000-000000000006",
      "category_id": "aca30000-0000-4000-8000-000000000006",
      "name": "VR-сеанс · игровое место",
      "price": 900,
      "item_type": "rental",
      "description": "Забронируйте два игровых места на выбранный период.",
      "is_visible": true,
      "is_available": true,
      "duration_minutes": 45,
      "preparation_time": 45,
      "categories": {
        "name": "Развлечения"
      },
      "item_price_rules": [],
      "menu_item_option_groups": [],
      "rent_period_unit": "hour",
      "rent_period_step": 1,
      "total_quantity": 4,
      "quantity_available": 4,
      "is_training": false,
      "training_mode": null,
      "max_group_size": null,
      "portion_g": null,
      "includes": null
    }
  ],
  "masters": [
    {
      "id": "aca40000-0000-4000-8000-000000000001",
      "employee_store_id": "aca10000-0000-4000-8000-000000000003",
      "full_name": "Анна · массажист",
      "master_bio": "Мастер массажа",
      "master_photo_url": null
    },
    {
      "id": "aca40000-0000-4000-8000-000000000002",
      "employee_store_id": "aca10000-0000-4000-8000-000000000003",
      "full_name": "Мария · массажист",
      "master_bio": "Мастер массажа",
      "master_photo_url": null
    },
    {
      "id": "aca40000-0000-4000-8000-000000000003",
      "employee_store_id": "aca10000-0000-4000-8000-000000000004",
      "full_name": "Алексей · тренер",
      "master_bio": "Персональные и групповые тренировки",
      "master_photo_url": null
    },
    {
      "id": "aca40000-0000-4000-8000-000000000004",
      "employee_store_id": "aca10000-0000-4000-8000-000000000005",
      "full_name": "Ольга · преподаватель",
      "master_bio": "Разговорный английский",
      "master_photo_url": null
    }
  ],
  "lessons": [
    {
      "id": "delivery",
      "version": 2,
      "title": "Закажи обед с доставкой",
      "direction": "food",
      "store_id": "aca10000-0000-4000-8000-000000000001",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000001"
      ],
      "kind": "order",
      "actors": [
        {
          "role": "Оплата",
          "status": "paid",
          "label": "Оплачен",
          "text": "Оплата подтверждена. Настоящие деньги не списываются."
        },
        {
          "role": "Продавец",
          "status": "in_progress",
          "label": "В работе",
          "text": "Кафе приняло заказ и готовит обед."
        },
        {
          "role": "Продавец",
          "status": "looking_for_courier",
          "label": "Ищем курьера",
          "text": "Кафе начало поиск курьера."
        },
        {
          "role": "Курьер",
          "status": "looking_for_courier",
          "label": "Курьер найден",
          "text": "курьер принял предложение. Заказ ещё находится в кафе."
        },
        {
          "role": "Продавец",
          "status": "handed_to_courier",
          "label": "Курьер забирает заказ",
          "text": "Кафе передаёт приготовленный заказ курьеру."
        },
        {
          "role": "Курьер",
          "status": "accepted_by_courier",
          "label": "Едет к вам",
          "text": "Курьер подтвердил получение заказа и направился к клиенту."
        },
        {
          "role": "Курьер",
          "status": "issued",
          "label": "Выдан",
          "text": "Курьер подтвердил доставку. Доставка завершена."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000001": 490
      },
      "duration": 45,
      "master_ids": [],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "map",
      "required_steps": [
        "map_open",
        "map_pin",
        "map_sort",
        "delivery_filter",
        "venue_row"
      ]
    },
    {
      "id": "compare_purchase",
      "version": 2,
      "title": "Сравни и купи дрель",
      "direction": "goods",
      "store_id": "aca10000-0000-4000-8000-000000000002",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000002",
        "aca20000-0000-4000-8000-000000000003"
      ],
      "kind": "order",
      "actors": [
        {
          "role": "Оплата",
          "status": "paid",
          "label": "Оплачен",
          "text": "Заказ оформлен после сравнения двух дрелей."
        },
        {
          "role": "Продавец",
          "status": "in_progress",
          "label": "В работе",
          "text": "Магазин принял заказ и готовит выбранный товар."
        },
        {
          "role": "Продавец",
          "status": "ready",
          "label": "Готов",
          "text": "Товар подготовлен. В обычном заказе теперь можно прийти за ним."
        },
        {
          "role": "Продавец",
          "status": "issued",
          "label": "Выдан",
          "text": "Магазин подтвердил выдачу. В Академии получение товара имитируется."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000002": 3900,
        "aca20000-0000-4000-8000-000000000003": 5200
      },
      "duration": 45,
      "master_ids": [],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "direct",
      "required_steps": []
    },
    {
      "id": "rent_tool",
      "version": 2,
      "title": "Возьми перфоратор в аренду",
      "direction": "goods",
      "store_id": "aca10000-0000-4000-8000-000000000002",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000004"
      ],
      "kind": "rent",
      "actors": [
        {
          "role": "Клиент",
          "status": "pending",
          "label": "Ожидает",
          "text": "Вы выбрали период и оформили аренду."
        },
        {
          "role": "Продавец",
          "status": "active",
          "label": "Активна",
          "text": "Продавец выдал инструмент. Проверьте начало и окончание аренды."
        },
        {
          "role": "Продавец",
          "status": "completed",
          "label": "Возвращено",
          "text": "Время в демонстрации ускорено: продавец принял инструмент обратно."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000004": 650
      },
      "duration": 45,
      "master_ids": [],
      "rent_unit": "day",
      "min_quantity": 1,
      "route": "direct",
      "required_steps": []
    },
    {
      "id": "massage",
      "version": 2,
      "title": "Запишись на массаж",
      "direction": "services",
      "store_id": "aca10000-0000-4000-8000-000000000003",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000005"
      ],
      "kind": "booking",
      "actors": [
        {
          "role": "Клиент",
          "status": "booked",
          "label": "Запись создана",
          "text": "Вы выбрали услугу, мастера и свободное время. Дополнительное согласование не требуется."
        },
        {
          "role": "Мастер",
          "status": "completed",
          "label": "Завершена",
          "text": "Время в демонстрации ускорено: посещение состоялось, специалист завершил его."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000005": 1800
      },
      "duration": 45,
      "master_ids": [
        "aca40000-0000-4000-8000-000000000001",
        "aca40000-0000-4000-8000-000000000002"
      ],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "master",
      "required_steps": [
        "masters_tab",
        "master_profile",
        "master_service",
        "booking_date"
      ]
    },
    {
      "id": "group_training",
      "version": 2,
      "title": "Запишись на групповую тренировку",
      "direction": "sport",
      "store_id": "aca10000-0000-4000-8000-000000000004",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000006"
      ],
      "kind": "booking",
      "actors": [
        {
          "role": "Клиент",
          "status": "booked",
          "label": "Место в группе",
          "text": "Вы записались в занятие по готовому расписанию. Одно место занято вами."
        },
        {
          "role": "Тренер",
          "status": "completed",
          "label": "Завершена",
          "text": "Время в демонстрации ускорено: посещение состоялось, специалист завершил его."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000006": 700
      },
      "duration": 45,
      "master_ids": [
        "aca40000-0000-4000-8000-000000000003"
      ],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "schedule",
      "required_steps": [
        "schedule_tab",
        "schedule_item",
        "schedule_date",
        "schedule_slot"
      ]
    },
    {
      "id": "personal_group",
      "version": 2,
      "title": "Запишись на персональную тренировку в группе",
      "direction": "sport",
      "store_id": "aca10000-0000-4000-8000-000000000004",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000007"
      ],
      "kind": "booking",
      "actors": [
        {
          "role": "Клиент",
          "status": "pending_approval",
          "label": "Ожидает тренера",
          "text": "Заявка отправлена с удобным интервалом. Итоговое время ещё выбирает тренер."
        },
        {
          "role": "Тренер",
          "status": "booked",
          "label": "Время подтверждено",
          "text": "Тренер согласовал общее время для трёх демонстрационных участников. Итоговая стоимость для вас — 800 ₽."
        },
        {
          "role": "Тренер",
          "status": "completed",
          "label": "Завершена",
          "text": "Время в демонстрации ускорено: посещение состоялось, специалист завершил его."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000007": 2400
      },
      "duration": 45,
      "master_ids": [
        "aca40000-0000-4000-8000-000000000003"
      ],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "master",
      "required_steps": [
        "masters_tab",
        "master_profile",
        "master_service",
        "booking_date"
      ]
    },
    {
      "id": "trial_lesson",
      "version": 2,
      "title": "Запишись на пробный урок",
      "direction": "education",
      "store_id": "aca10000-0000-4000-8000-000000000005",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000008"
      ],
      "kind": "booking",
      "actors": [
        {
          "role": "Клиент",
          "status": "booked",
          "label": "Урок запланирован",
          "text": "Вы выбрали индивидуальный урок, преподавателя и время."
        },
        {
          "role": "Преподаватель",
          "status": "completed",
          "label": "Завершена",
          "text": "Время в демонстрации ускорено: посещение состоялось, специалист завершил его."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000008": 900
      },
      "duration": 45,
      "master_ids": [
        "aca40000-0000-4000-8000-000000000004"
      ],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "schedule",
      "required_steps": [
        "schedule_tab",
        "schedule_item",
        "schedule_date",
        "schedule_slot"
      ]
    },
    {
      "id": "vr_session",
      "version": 3,
      "title": "Забронируй VR-сеанс для двоих",
      "direction": "entertainment",
      "store_id": "aca10000-0000-4000-8000-000000000006",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000009"
      ],
      "kind": "rent",
      "actors": [
        {
          "role": "Клиент",
          "status": "pending",
          "label": "Ожидает",
          "text": "Вы выбрали два игровых места и период сеанса."
        },
        {
          "role": "Администратор",
          "status": "active",
          "label": "Активна",
          "text": "Администратор предоставил два игровых места."
        },
        {
          "role": "Администратор",
          "status": "completed",
          "label": "Возвращено",
          "text": "Время в демонстрации ускорено: администратор завершил использование мест."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000009": 900
      },
      "duration": 45,
      "master_ids": [],
      "rent_unit": "hour",
      "min_quantity": 2,
      "route": "direct",
      "required_steps": []
    },
    {
      "id": "home_training",
      "version": 2,
      "title": "Найди занятие с главной",
      "direction": "sport",
      "store_id": "aca10000-0000-4000-8000-000000000004",
      "item_ids": [
        "aca20000-0000-4000-8000-000000000006"
      ],
      "kind": "booking",
      "actors": [
        {
          "role": "Клиент",
          "status": "booked",
          "label": "Место в группе",
          "text": "Вы записались в занятие по готовому расписанию. Одно место занято вами."
        },
        {
          "role": "Тренер",
          "status": "completed",
          "label": "Завершена",
          "text": "Время в демонстрации ускорено: посещение состоялось, специалист завершил его."
        }
      ],
      "prices": {
        "aca20000-0000-4000-8000-000000000006": 700
      },
      "duration": 45,
      "master_ids": [
        "aca40000-0000-4000-8000-000000000003"
      ],
      "rent_unit": "hour",
      "min_quantity": 1,
      "route": "home",
      "required_steps": [
        "home_direction",
        "home_shortcut",
        "home_venue",
        "schedule_item",
        "schedule_date",
        "schedule_slot"
      ]
    }
  ]
};
