"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  ShoppingBag,
  Trophy,
  Shield,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  User,
  History,
  Lock,
  Gift,
  Tag,
  Flame,
} from "lucide-react";

interface EconomyConfig {
  currencyName: string;
  currencySymbol: string;
  messageCoinsMin: number;
  messageCoinsMax: number;
  messageCooldownSeconds: number;
  voiceCoinsPerMinute: number;
  dailyBaseCoins: number;
  dailyStreakBonusCoins: number;
  payFeePercent: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "role" | "badge" | "custom_voice" | "custom";
  roleId?: string;
  badgeIcon?: string;
  stock?: number;
  requiredLevel?: number;
  enabled: boolean;
}

interface UserWallet {
  userId: string;
  tag?: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  type: "role" | "badge" | "custom_voice" | "custom";
  purchasedAt: string;
  pricePaid: number;
  roleId?: string;
  badgeIcon?: string;
}

interface Transaction {
  id: string;
  timestamp: string;
  userId: string;
  userTag?: string;
  targetUserId?: string;
  targetUserTag?: string;
  type: string;
  amount: number;
  reason: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export default function EconomyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<EconomyConfig | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<(UserWallet & { rank: number })[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);

  const [activeTab, setActiveTab] = useState<"shop" | "leaderboard" | "inventory" | "admin">("shop");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Admin Modal für Shop-Item
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState(500);
  const [itemType, setItemType] = useState<"role" | "badge" | "custom_voice" | "custom">("role");
  const [itemRoleId, setItemRoleId] = useState("");
  const [itemBadgeIcon, setItemBadgeIcon] = useState("⭐");
  const [itemStock, setItemStock] = useState(-1);
  const [itemRequiredLevel, setItemRequiredLevel] = useState(0);
  const [itemEnabled, setItemEnabled] = useState(true);

  // Admin Config Form
  const [editConfig, setEditConfig] = useState<EconomyConfig | null>(null);

  // Admin Balance Anpassung
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct" | "set">("add");
  const [adjustReason, setAdjustReason] = useState("");

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setIsLoggedIn(Boolean(data?.authenticated));
        setCurrentUser(data?.user || null);
      }
    } catch {
      setIsLoggedIn(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bot/economy");
      if (!res.ok) throw new Error("Fehler beim Laden der Wirtschaftsdaten");
      const data = await res.json();
      setConfig(data.config || null);
      setEditConfig(data.config || null);
      setShopItems(data.shopItems || []);
      setLeaderboard(data.leaderboard || []);
      setTransactions(data.transactions || []);
      setUserWallet(data.userWallet || null);
      setUserInventory(data.userInventory || []);
      setRoles(data.roles || []);
    } catch (err: any) {
      setError(err?.message || "Konnte Daten nicht laden");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(itemId: string) {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setBuyingId(itemId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/economy/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kauf fehlgeschlagen");
      setSuccess(`Erfolgreich gekauft: ${data.item.name}! Neuer Kontostand: ${data.newBalance.toLocaleString("de-DE")} ${config?.currencySymbol}`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Kauf");
    } finally {
      setBuyingId(null);
    }
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemName("");
    setItemDesc("");
    setItemPrice(500);
    setItemType("role");
    setItemRoleId(roles[0]?.id || "");
    setItemBadgeIcon("⭐");
    setItemStock(-1);
    setItemRequiredLevel(0);
    setItemEnabled(true);
    setShowItemModal(true);
  }

  function openEditItem(item: ShopItem) {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description);
    setItemPrice(item.price);
    setItemType(item.type);
    setItemRoleId(item.roleId || roles[0]?.id || "");
    setItemBadgeIcon(item.badgeIcon || "⭐");
    setItemStock(item.stock ?? -1);
    setItemRequiredLevel(item.requiredLevel ?? 0);
    setItemEnabled(item.enabled);
    setShowItemModal(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: itemName,
        description: itemDesc,
        price: Number(itemPrice),
        type: itemType,
        roleId: itemType === "role" ? itemRoleId : undefined,
        badgeIcon: itemType === "badge" ? itemBadgeIcon : undefined,
        stock: Number(itemStock),
        requiredLevel: Number(itemRequiredLevel),
        enabled: itemEnabled,
      };

      let res;
      if (editingItem) {
        res = await fetch("/api/bot/economy/shop/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, patch: payload }),
        });
      } else {
        res = await fetch("/api/bot/economy/shop/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Speichern des Artikels");
      setSuccess("Artikel erfolgreich gespeichert.");
      setShowItemModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Diesen Artikel wirklich aus dem Shop löschen?")) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/economy/shop/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Löschen fehlgeschlagen");
      setSuccess("Artikel gelöscht.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler");
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editConfig) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/economy/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      setSuccess("Währungseinstellungen aktualisiert.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustUserId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bot/economy/admin/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustUserId.trim(),
          amount: Number(adjustAmount),
          mode: adjustMode,
          reason: adjustReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Anpassung fehlgeschlagen");
      setSuccess(`Kontostand von ${adjustUserId} erfolgreich aktualisiert.`);
      setAdjustUserId("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = shopItems.filter((item) => {
    if (!isLoggedIn && !item.enabled) return false;
    if (selectedCategory === "all") return true;
    return item.type === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-discord-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Wirtschaft & Belohnungs-Shop
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {config?.currencyName || "Coins"} {config?.currencySymbol || "🪙"}
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Sammle Coins durch Chat- & Voice-Aktivität oder /daily und tausche sie gegen exklusive Rollen und Badges ein.
              </p>
            </div>
          </div>
        </div>

        {/* Guthaben-Kachel wenn eingeloggt */}
        {isLoggedIn && userWallet && (
          <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
              {config?.currencySymbol || "🪙"}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Dein Kontostand</p>
              <p className="text-xl font-bold text-amber-300">
                {userWallet.balance.toLocaleString("de-DE")}{" "}
                <span className="text-sm text-amber-200/80">{config?.currencyName || "Coins"}</span>
              </p>
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-medium text-sm transition-all shadow-md shadow-discord-blurple/20 self-start md:self-auto"
          >
            <span>Mit Discord einloggen</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Benachrichtigungen */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-discord-green/10 border border-discord-green/30 text-discord-green text-sm flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-discord-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "shop"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-discord-card"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Belohnungs-Shop</span>
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "leaderboard"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-discord-card"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Vermögens-Rangliste</span>
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "inventory"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-discord-card"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mein Inventar ({userInventory.length})</span>
            </button>
          )}
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "admin"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-discord-card"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Verwaltung & Konfiguration</span>
            </button>
          )}
        </div>

        {activeTab === "shop" && isLoggedIn && (
          <button
            onClick={openCreateItem}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Artikel hinzufügen</span>
          </button>
        )}
      </div>

      {/* Tab: SHOP */}
      {activeTab === "shop" && (
        <div className="space-y-6">
          {/* Kategorie-Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: "Alle Artikel" },
              { id: "role", label: "🎭 Discord-Rollen" },
              { id: "badge", label: "⭐ Profil-Badges" },
              { id: "custom_voice", label: "🔊 Voice-Features" },
              { id: "custom", label: "🎁 Besondere Vorteile" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? "bg-discord-blurple text-white shadow-md shadow-discord-blurple/20"
                    : "bg-discord-card text-gray-400 hover:text-white hover:bg-discord-card/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-discord-card border border-discord-border rounded-2xl">
              <ShoppingBag className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Keine Artikel gefunden</h3>
              <p className="text-xs text-gray-400 mt-1">
                In dieser Kategorie stehen derzeit keine Artikel im Shop zur Verfügung.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const canAfford = userWallet ? userWallet.balance >= item.price : true;
                const outOfStock = item.stock !== undefined && item.stock !== -1 && item.stock <= 0;
                const role = item.roleId ? roles.find((r) => r.id === item.roleId) : null;

                return (
                  <div
                    key={item.id}
                    className={`bg-discord-card border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      !item.enabled ? "opacity-60 border-dashed border-gray-600" : "border-discord-border hover:border-amber-500/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {item.type === "role"
                              ? "🎭"
                              : item.type === "badge"
                              ? item.badgeIcon || "⭐"
                              : item.type === "custom_voice"
                              ? "🔊"
                              : "🎁"}
                          </span>
                          <div>
                            <h3 className="font-bold text-white text-base leading-tight">{item.name}</h3>
                            <span className="text-[11px] text-gray-400 capitalize">
                              {item.type === "role"
                                ? "Discord-Rolle"
                                : item.type === "badge"
                                ? "Profil-Badge"
                                : item.type === "custom_voice"
                                ? "Voice-Feature"
                                : "Belohnung"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm">
                          <span>{item.price.toLocaleString("de-DE")}</span>
                          <span className="text-xs">{config?.currencySymbol || "🪙"}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed mb-4">{item.description}</p>

                      {/* Details & Tags */}
                      <div className="space-y-1.5 mb-5 text-[11px]">
                        {role && (
                          <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                            <Shield className="w-3.5 h-3.5" />
                            <span>
                              Verknüpfte Rolle: <strong>@{role.name}</strong>
                            </span>
                          </div>
                        )}
                        {item.requiredLevel && item.requiredLevel > 0 ? (
                          <div className="flex items-center gap-2 text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              Voraussetzung: <strong>Level {item.requiredLevel}+</strong>
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2 text-gray-400 bg-discord-dark/50 px-2.5 py-1 rounded-lg">
                          <Tag className="w-3.5 h-3.5" />
                          <span>
                            Bestand:{" "}
                            {item.stock === undefined || item.stock === -1
                              ? "Unbegrenzt"
                              : item.stock > 0
                              ? `${item.stock} Stück verfügbar`
                              : "Ausverkauft"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-discord-border flex items-center justify-between gap-2">
                      {isLoggedIn ? (
                        <button
                          onClick={() => handleBuy(item.id)}
                          disabled={buyingId === item.id || outOfStock || !canAfford || !item.enabled}
                          className={`w-full py-2 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                            outOfStock
                              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                              : !canAfford
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                              : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                          }`}
                        >
                          {buyingId === item.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : outOfStock ? (
                            "Ausverkauft"
                          ) : !canAfford ? (
                            "Zu wenig Coins"
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Jetzt kaufen ({item.price.toLocaleString("de-DE")} {config?.currencySymbol})</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="w-full py-2 px-4 rounded-xl bg-discord-dark hover:bg-discord-darker text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-discord-border"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Einloggen zum Kaufen</span>
                        </Link>
                      )}

                      {isLoggedIn && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-discord-dark transition-all"
                            title="Artikel bearbeiten"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                            title="Artikel löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: VERMÖGENS-RANGLISTE */}
      {activeTab === "leaderboard" && (
        <div className="bg-discord-card border border-discord-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-discord-border flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Top 20 wohlhabendste Mitglieder
            </h3>
            <span className="text-xs text-gray-400">Sortiert nach aktuellem Kontostand</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              Noch keine Mitglieder mit Guthaben registriert.
            </div>
          ) : (
            <div className="divide-y divide-discord-border">
              {leaderboard.map((user, idx) => {
                const medal =
                  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                return (
                  <div key={user.userId} className="px-6 py-3.5 flex items-center justify-between hover:bg-discord-dark/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center font-bold text-sm text-gray-300">{medal}</span>
                      <div className="w-9 h-9 rounded-full bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                        {user.tag ? user.tag.slice(0, 2).toUpperCase() : "??"}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{user.tag || `Nutzer ${user.userId}`}</p>
                        <p className="text-[11px] text-gray-400">
                          Gesamt verdient: {user.totalEarned.toLocaleString("de-DE")} {config?.currencySymbol} • Ausgegeben: {user.totalSpent.toLocaleString("de-DE")} {config?.currencySymbol}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-amber-300 text-base">
                        {user.balance.toLocaleString("de-DE")}{" "}
                        <span className="text-xs text-amber-200/80">{config?.currencySymbol || "🪙"}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">{config?.currencyName || "Coins"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: INVENTAR */}
      {activeTab === "inventory" && isLoggedIn && (
        <div className="space-y-6">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              Deine erworbenen Artikel ({userInventory.length})
            </h3>

            {userInventory.length === 0 ? (
              <p className="text-sm text-gray-400">
                Du hast bisher noch keine Artikel im Belohnungs-Shop gekauft. Durchstöbere das Shop-Angebot!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userInventory.map((inv) => (
                  <div key={inv.id} className="p-4 rounded-xl bg-discord-dark border border-discord-border">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {inv.type === "role" ? "🎭" : inv.type === "badge" ? inv.badgeIcon || "⭐" : "🎁"}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{inv.itemName}</h4>
                        <span className="text-[10px] text-gray-400">
                          Gekauft: {new Date(inv.purchasedAt).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Gezahlt: {inv.pricePaid.toLocaleString("de-DE")} {config?.currencySymbol}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: ADMIN & VERWALTUNG */}
      {activeTab === "admin" && isLoggedIn && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Währungs-Konfiguration */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              Währung & Belohnungsraten
            </h3>
            <p className="text-xs text-gray-400">
              Passe an, wie die Server-Währung heißt und wie viele Coins Mitglieder für Chat & Voice erhalten.
            </p>

            {editConfig && (
              <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Name der Währung</label>
                    <input
                      type="text"
                      value={editConfig.currencyName}
                      onChange={(e) => setEditConfig({ ...editConfig, currencyName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                      placeholder="z. B. Coins"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Symbol / Emoji</label>
                    <input
                      type="text"
                      value={editConfig.currencySymbol}
                      onChange={(e) => setEditConfig({ ...editConfig, currencySymbol: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                      placeholder="z. B. 🪙"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Chat-Coins (Min)</label>
                    <input
                      type="number"
                      min="0"
                      value={editConfig.messageCoinsMin}
                      onChange={(e) => setEditConfig({ ...editConfig, messageCoinsMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Chat-Coins (Max)</label>
                    <input
                      type="number"
                      min="1"
                      value={editConfig.messageCoinsMax}
                      onChange={(e) => setEditConfig({ ...editConfig, messageCoinsMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Cooldown (Sek.)</label>
                    <input
                      type="number"
                      min="5"
                      value={editConfig.messageCooldownSeconds}
                      onChange={(e) => setEditConfig({ ...editConfig, messageCooldownSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Voice-Coins / Min.</label>
                    <input
                      type="number"
                      min="0"
                      value={editConfig.voiceCoinsPerMinute}
                      onChange={(e) => setEditConfig({ ...editConfig, voiceCoinsPerMinute: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Daily Basis-Coins</label>
                    <input
                      type="number"
                      min="0"
                      value={editConfig.dailyBaseCoins}
                      onChange={(e) => setEditConfig({ ...editConfig, dailyBaseCoins: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Daily Streak-Bonus</label>
                    <input
                      type="number"
                      min="0"
                      value={editConfig.dailyStreakBonusCoins}
                      onChange={(e) => setEditConfig({ ...editConfig, dailyStreakBonusCoins: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Überweisungs-Gebühr (/pay in %)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editConfig.payFeePercent || 0}
                    onChange={(e) => setEditConfig({ ...editConfig, payFeePercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-all shadow-md shadow-amber-500/20"
                >
                  {saving ? "Wird gespeichert..." : "Einstellungen speichern"}
                </button>
              </form>
            )}
          </div>

          {/* Manuelle Guthaben-Anpassung */}
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-discord-blurple" />
              Kontostand manuell anpassen
            </h3>
            <p className="text-xs text-gray-400">
              Vergib Coins als Belohnung für Events oder ziehe Coins bei Regelverstößen ab.
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Discord Nutzer-ID</label>
                <input
                  type="text"
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  placeholder="z. B. 548842540074401802"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Aktion</label>
                  <select
                    value={adjustMode}
                    onChange={(e) => setAdjustMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  >
                    <option value="add">➕ Coins hinzufügen</option>
                    <option value="deduct">➖ Coins abziehen</option>
                    <option value="set">⚙️ Exakten Saldo setzen</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Betrag</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Begründung (Audit-Log)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  placeholder="z. B. Turniersieg oder Event-Belohnung"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-discord-blurple hover:bg-indigo-600 text-white font-medium text-sm transition-all shadow-md shadow-discord-blurple/20"
              >
                {saving ? "Wird ausgeführt..." : "Kontostand anpassen"}
              </button>
            </form>
          </div>

          {/* Letzte Transaktionen */}
          <div className="lg:col-span-2 bg-discord-card border border-discord-border rounded-2xl p-6">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Letzte Transaktionen auf dem Server
            </h3>
            <div className="max-h-60 overflow-y-auto divide-y divide-discord-border text-xs">
              {transactions.length === 0 ? (
                <p className="text-gray-400 py-3">Noch keine Transaktionen aufgezeichnet.</p>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{t.userTag || t.userId}</span>
                      <span className="text-gray-400 ml-2">• {t.reason}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold ${
                          t.amount >= 0 ? "text-discord-green" : "text-rose-400"
                        }`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount.toLocaleString("de-DE")} {config?.currencySymbol}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(t.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Shop-Item Erstellen / Bearbeiten */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-discord-card border border-discord-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-discord-border pb-3">
              <h3 className="font-bold text-white text-base">
                {editingItem ? "Artikel bearbeiten" : "Neuen Artikel anlegen"}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Artikelname</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  placeholder="z. B. VIP Rolle"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Beschreibung</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm resize-none h-20"
                  placeholder="Was bewirkt dieser Artikel?"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Preis ({config?.currencySymbol || "Coins"})</label>
                  <input
                    type="number"
                    min="1"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Artikel-Typ</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  >
                    <option value="role">🎭 Discord-Rolle</option>
                    <option value="badge">⭐ Profil-Badge</option>
                    <option value="custom_voice">🔊 Voice-Feature</option>
                    <option value="custom">🎁 Sonstiges</option>
                  </select>
                </div>
              </div>

              {itemType === "role" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Zu vergebende Discord-Rolle</label>
                  <select
                    value={itemRoleId}
                    onChange={(e) => setItemRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {itemType === "badge" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Badge-Icon (Emoji)</label>
                  <input
                    type="text"
                    value={itemBadgeIcon}
                    onChange={(e) => setItemBadgeIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                    placeholder="⭐"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Bestand (-1 = Unbegrenzt)</label>
                  <input
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mindest-Level (0 = Keins)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemRequiredLevel}
                    onChange={(e) => setItemRequiredLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-discord-dark border border-discord-border text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={itemEnabled}
                  onChange={(e) => setItemEnabled(e.target.checked)}
                  className="rounded bg-discord-dark border-discord-border text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="enabledCheck" className="text-xs text-gray-300">
                  Artikel im Shop aktiv & sichtbar schalten
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-discord-border">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-md shadow-amber-500/20"
                >
                  {saving ? "Wird gespeichert..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
