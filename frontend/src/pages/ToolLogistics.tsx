import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

type Status = 'delivered' | 'transit' | 'customs' | 'pending';

interface TrackingEvent {
  time: string;
  location: string;
  desc: string;
}

interface Order {
  id: string;
  product: string;
  dest: string;
  status: Status;
  updated: string;
  weight: string;
  carrier: string;
  tracking: TrackingEvent[];
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  delivered: { label: '已签收', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  transit:   { label: '运输中', color: 'bg-sky-100 text-sky-700 border-sky-200',             dot: 'bg-sky-500' },
  customs:   { label: '清关中', color: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  pending:   { label: '待揽件', color: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400' },
};

const PRODUCT_EN: Record<string, string> = {
  '青花瓷茶杯套装': 'Blue-and-white porcelain tea set',
  '蚕丝刺绣丝巾': 'Silk embroidered scarf',
  '手工香囊礼盒': 'Handmade sachet gift box',
  '景泰蓝工艺扇': 'Cloisonné craft fan',
  '汉服改良旗袍': 'Hanfu-inspired qipao',
};

const DEST_EN: Record<string, string> = {
  '墨西哥 · 墨西哥城': 'Mexico · Mexico City',
  '墨西哥 · 瓜达拉哈拉': 'Mexico · Guadalajara',
  '智利 · 圣地亚哥': 'Chile · Santiago',
  '秘鲁 · 利马': 'Peru · Lima',
  '墨西哥 · 蒙特雷': 'Mexico · Monterrey',
};

const CARRIER_EN: Record<string, string> = {
  '顺丰国际': 'SF International',
  'DHL Express': 'DHL Express',
  '中邮 EMS': 'China Post EMS',
};

const LOCATION_EN: Record<string, string> = {
  '墨西哥城配送中心': 'Mexico City Distribution Center',
  '墨西哥城海关': 'Mexico City Customs',
  '墨西哥城机场': 'Mexico City Airport',
  '上海浦东机场': 'Shanghai Pudong Airport',
  '上海分拨中心': 'Shanghai Sorting Center',
  '洛杉矶转运中心': 'Los Angeles Hub',
  '圣地亚哥海关': 'Santiago Customs',
  '圣地亚哥机场': 'Santiago Airport',
  '迈阿密转运中心': 'Miami Hub',
  '广州分拨中心': 'Guangzhou Sorting Center',
};

const DESC_EN: Record<string, string> = {
  '包裹已签收，签收人：R. GARCIA': 'Delivered, signed by R. GARCIA',
  '派件中，预计当天送达': 'Out for delivery, expected today',
  '清关完成，放行': 'Customs cleared, released',
  '到达目的地机场，等待清关': 'Arrived at destination airport, awaiting customs',
  '出口清关完成，已装机起飞': 'Export customs completed, departed by air',
  '包裹已揽件，称重 1.2kg': 'Picked up, weight 1.2kg',
  '经洛杉矶转运，已发往墨西哥': 'Rerouted via Los Angeles and sent to Mexico',
  '出口清关完成，已装机': 'Export customs completed, loaded onto flight',
  '包裹已揽件，称重 0.4kg': 'Picked up, weight 0.4kg',
  '到达海关，等待查验，预计 2-3 个工作日': 'Arrived at customs, inspection pending, 2-3 business days',
  '货物抵达，办理入境手续': 'Cargo arrived, import procedures in progress',
  '转运发往南美': 'Transshipped to South America',
  '出口清关，交 DHL 收运': 'Export customs cleared, handed to DHL',
  '电子面单已创建，等待揽件': 'Shipping label created, waiting for pickup',
  '已装机，飞往洛杉矶': 'Loaded onto flight to Los Angeles',
  '已揽件，称重 0.9kg，出口清关中': 'Picked up, weight 0.9kg, export customs in progress',
};

const ORDERS: Order[] = [
  {
    id: 'PUENTE-MEX-2024-00123',
    product: '青花瓷茶杯套装',
    dest: '墨西哥 · 墨西哥城',
    status: 'delivered',
    updated: '2024-03-18 14:22',
    weight: '1.2kg',
    carrier: '顺丰国际',
    tracking: [
      { time: '2024-03-18 14:22', location: '墨西哥 · 墨西哥城', desc: '包裹已签收，签收人：R. GARCIA' },
      { time: '2024-03-17 09:10', location: '墨西哥城配送中心', desc: '派件中，预计当天送达' },
      { time: '2024-03-16 21:05', location: '墨西哥城海关', desc: '清关完成，放行' },
      { time: '2024-03-14 08:30', location: '墨西哥城机场', desc: '到达目的地机场，等待清关' },
      { time: '2024-03-12 22:00', location: '上海浦东机场', desc: '出口清关完成，已装机起飞' },
      { time: '2024-03-12 16:45', location: '上海分拨中心', desc: '包裹已揽件，称重 1.2kg' },
    ],
  },
  {
    id: 'PUENTE-MEX-2024-00124',
    product: '蚕丝刺绣丝巾',
    dest: '墨西哥 · 瓜达拉哈拉',
    status: 'transit',
    updated: '2024-03-19 03:41',
    weight: '0.4kg',
    carrier: '顺丰国际',
    tracking: [
      { time: '2024-03-19 03:41', location: '洛杉矶转运中心', desc: '经洛杉矶转运，已发往墨西哥' },
      { time: '2024-03-18 11:20', location: '上海浦东机场', desc: '出口清关完成，已装机' },
      { time: '2024-03-18 08:55', location: '上海分拨中心', desc: '包裹已揽件，称重 0.4kg' },
    ],
  },
  {
    id: 'PUENTE-CHL-2024-00089',
    product: '手工香囊礼盒',
    dest: '智利 · 圣地亚哥',
    status: 'customs',
    updated: '2024-03-18 17:30',
    weight: '0.8kg',
    carrier: 'DHL Express',
    tracking: [
      { time: '2024-03-18 17:30', location: '圣地亚哥海关', desc: '到达海关，等待查验，预计 2-3 个工作日' },
      { time: '2024-03-17 22:10', location: '圣地亚哥机场', desc: '货物抵达，办理入境手续' },
      { time: '2024-03-16 14:00', location: '迈阿密转运中心', desc: '转运发往南美' },
      { time: '2024-03-15 09:30', location: '上海浦东机场', desc: '出口清关，交 DHL 收运' },
    ],
  },
  {
    id: 'PUENTE-PER-2024-00045',
    product: '景泰蓝工艺扇',
    dest: '秘鲁 · 利马',
    status: 'pending',
    updated: '2024-03-19 10:00',
    weight: '0.6kg',
    carrier: '中邮 EMS',
    tracking: [
      { time: '2024-03-19 10:00', location: '广州分拨中心', desc: '电子面单已创建，等待揽件' },
    ],
  },
  {
    id: 'PUENTE-MEX-2024-00125',
    product: '汉服改良旗袍',
    dest: '墨西哥 · 蒙特雷',
    status: 'transit',
    updated: '2024-03-19 05:22',
    weight: '0.9kg',
    carrier: '顺丰国际',
    tracking: [
      { time: '2024-03-19 05:22', location: '上海浦东机场', desc: '已装机，飞往洛杉矶' },
      { time: '2024-03-18 23:10', location: '上海分拨中心', desc: '已揽件，称重 0.9kg，出口清关中' },
    ],
  },
];

const STATS = [
  { labelZh: '总订单', labelEn: 'Total Orders', value: ORDERS.length, color: 'text-slate-800' },
  { labelZh: '已签收', labelEn: 'Delivered', value: ORDERS.filter(o => o.status === 'delivered').length, color: 'text-emerald-600' },
  { labelZh: '运输中', labelEn: 'In Transit', value: ORDERS.filter(o => o.status === 'transit').length, color: 'text-sky-600' },
  { labelZh: '清关中', labelEn: 'Customs', value: ORDERS.filter(o => o.status === 'customs').length, color: 'text-amber-600' },
];

export default function ToolLogistics() {
  const { t, lang } = useLocale();
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<Status | 'all'>('all');
  const [selected, setSelected]   = useState<string | null>(null);

  const filtered = ORDERS.filter(o => {
    const matchSearch = search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.product.includes(search) || o.dest.includes(search);
    const matchFilter = filter === 'all' || o.status === filter;
    return matchSearch && matchFilter;
  });

  const selectedOrder = ORDERS.find(o => o.id === selected);
  const l = (zh: string, en: string) => lang === 'en' ? en : zh;
  const mapText = (zh: string, map: Record<string, string>) => lang === 'en' ? (map[zh] ?? zh) : zh;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 演示数据提示 */}
      <div className="bg-amber-400 text-amber-900 text-sm font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
        <span>🚧</span>
        <span>{t('演示数据 · 功能开发中，以下订单数据均为示例，不代表真实业务', 'Demo data only. Orders shown below are examples.')}</span>
        <span>🚧</span>
      </div>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sky-200 text-sm mb-2">
            <Link to="/tools" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('工具箱', 'Toolkit')}
            </Link>
            <span>/</span>
            <span>{t('Puente 物流', 'Puente Logistics')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
                <h1 className="text-2xl font-bold">{t('Puente 物流追踪', 'Puente Logistics Tracking')}</h1>
                <p className="text-sky-200 text-sm mt-0.5">{t('拉美跨境物流全链路可视化 · 订单状态看板', 'Cross-border visibility · Order status dashboard')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {STATS.map(s => (
            <div key={s.labelZh} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{lang === 'en' ? s.labelEn : s.labelZh}</p>
            </div>
          ))}
        </div>

        {/* Filter & Search */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all"
                placeholder={t('搜索订单号、商品名、目的地…', 'Search order ID, product, destination...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'delivered', 'transit', 'customs', 'pending'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filter === f
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-sky-400 hover:text-sky-700'
                  }`}
                >
                  {f === 'all' ? t('全部订单', 'All Orders') : STATUS_CONFIG[f].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Order List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-sky-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">{t('没有找到匹配的订单', 'No matching orders found')}</p>
              <p className="text-sm font-medium text-slate-500">{t('没有找到匹配的订单', 'No matching orders found')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('请尝试修改搜索条件', 'Try adjusting search filters')}</p>
            </div>
          )}
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status];
            const isOpen = selected === order.id;
            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
                  isOpen ? 'border-sky-300 shadow-sky-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  className="w-full text-left px-5 py-4"
                  onClick={() => setSelected(isOpen ? null : order.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm font-mono truncate">{order.id}</p>
                        <p className="text-slate-700 text-sm mt-0.5">{mapText(order.product, PRODUCT_EN)}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{mapText(order.dest, DEST_EN)} · {mapText(order.carrier, CARRIER_EN)} · {order.weight}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cfg.color}`}>
                        {lang === 'en' ? ({ delivered: 'Delivered', transit: 'In Transit', customs: 'Customs', pending: 'Pending Pickup' }[order.status]) : cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">{order.updated}</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-sky-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {/* Tracking Timeline */}
                {isOpen && (
                  <div className="border-t border-sky-100 bg-sky-50/40 px-5 pb-5 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">{t('物流轨迹', 'Tracking Timeline')}</p>
                    <div className="relative pl-6">
                      <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200" />
                      <div className="space-y-5">
                        {order.tracking.map((ev, i) => (
                          <div key={i} className="relative">
                            <div className={`absolute -left-4 top-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                              i === 0
                                ? 'bg-sky-500 border-sky-500 shadow-sm shadow-sky-200'
                                : 'bg-white border-slate-300'
                            }`} />
                            <p className="text-xs text-slate-400 mb-0.5">{ev.time}</p>
                            <p className="text-sm font-semibold text-slate-800">{mapText(ev.location, LOCATION_EN)}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{mapText(ev.desc, DESC_EN)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
