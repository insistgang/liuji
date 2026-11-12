#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2026-11-12（第 22 期）词表注入脚本：复习窗口 + 已推荐索引"""
import re, sys, os

BASE = '/Users/insistgang/Desktop/个人工具/liuji/每日英语单词'

NEW = [
 ("approach","/əˈproʊtʃ/","n. 方法，途径；v. 接近，靠近；着手处理，与…接洽","We took a different approach to the same deadline problem.","我们用另一种方法处理了同一个截止日期问题。","词根 —— ap（朝向，同 approve / apt）+ pro（向前）——\"朝前走\"，所以既指\"靠近\"，也指\"向前走的一条路\"，即方法、途径。⚠️ 名词重音在后 /əˈproʊtʃ/，动词读音相同。","an approach to sth / take a different approach / approach sb about sth"),
 ("conclude","/kənˈkluːd/","v. 得出结论，断定；结束，完结；缔结（协议）","The panel concluded that the pilot program should be expanded.","评审组得出结论，认为试点项目应当扩大。","词根 —— con（共同）+ clude（关闭，同 include / exclude / closure）——\"把门关上\"，事情走到尽头即\"结束\"，盖棺定论即\"得出结论\"。⚠️ 拼写是 -clude 不是 -close。","conclude that... / conclude a meeting / come to a conclusion"),
 ("confirm","/kənˈfɜːrm/","v. 证实，确认；批准，核准（预订、任命）","Please confirm the shipment date before Friday.","请在周五前确认发货日期。","词根 —— con（共同）+ firm（坚固，同 firm / affirm）——\"把它钉牢成事实\"。⚠️ 与 conform（符合，11-05 已用）只差一个字母：confirm 是\"确认\"，conform 是\"符合规范\"。","confirm a booking / confirm receipt of / confirm that..."),
 ("contribute","/kənˈtrɪbjuːt/","v. 贡献，促成；投稿，撰稿；捐助","Each team member contributed at least one idea to the proposal.","每位团队成员都为提案贡献了至少一个想法。","词根 —— con（共同）+ tribute（给予，同 distribute / retribution）——\"一起给出去的东西\"，故为\"贡献\"。⚠️ 固定搭配 contribute to sth（助长、促成），介词必须是 to。","contribute to / make a contribution"),
 ("distribute","/dɪˈstrɪbjuːt/","v. 分发，分配；分销；散布（气体、光线）","We distributed the updated toolkit to all regional teams.","我们把更新后的工具包分发给了所有区域团队。","词根 —— dis（分开，同 dispense / distinct）+ tribute（给予，同 contribute）——\"把东西一份份拆开给出去\"，即分发。⚠️ 与 contribute 只差词首 di- 与 con-，方向完全相反。","distribute to / distribute evenly / distribution list"),
 ("estimate","/ˈestɪmeɪt/ /ˈestɪmət/","v. 估计，估算；n. 估计，估价（单）","We estimate the migration will take about six weeks.","我们估计这次迁移大约需要六周。","词根 —— 拉丁 aestimare（评估，同 estimate / estimation）——\"掂量出一个大概数\"。⚠️ 作动词读 /-meɪt/，作名词读 /-mət/，重音都在第一音节。","a rough estimate / estimate that... / give an estimate of"),
 ("infer","/ɪnˈfɜːr/","v. 推断，推论；暗示，意味着","From the tone of her reply, I inferred that the offer was not welcome.","从她回复的语气，我推断这个提议并不受欢迎。","词根 —— in（向内）+ fer（带，同 transfer / refer / confer）——\"把线索往里带，推出来\"，故是\"推断\"。⚠️ infer 表示\"根据证据推出\"，是六级阅读高频动词。","infer from sth / infer that..."),
 ("monitor","/ˈmɑːnɪtər/","v. 监测，监控；n. 显示器；监视器","We monitor the training pipeline on a dashboard every morning.","我们每天早上都在看板上监控训练流程。","词根 —— mon（警告，同 warn）+ itor（观察者）——\"一个不断警告危险的观察者\"。⚠️ 作动词重音在第一音节 /ˈmɑːnɪtər/。","monitor progress / closely monitored / remote monitoring"),
 ("overlap","/ˌoʊvərˈlæp/","v. 部分重叠；n. 重叠部分；共同之处","The two projects overlap for the first three weeks of the quarter.","这两个项目在本季度的前三周有部分重叠。","词根 —— over（在上）+ lap（覆盖）——\"一层盖在另一层上\"，中间压住的那一块就是\"重叠部分\"。⚠️ 注意与 elaborate 等 over- 前缀词区分：over- 在此表\"在上\"。","overlap with / a slight overlap / overlapping interests"),
 ("substitute","/ˈsʌbstɪtuːt/","n. 替补品，代用品；v. 代替，取代","No substitute for the lead engineer was available for that sprint.","那个迭代周期没有可替代主程工程师的人选。","词根 —— sub（在…之下）+ stitute（放置，同 institute / constitute）——\"把另一样东西放在它的位置上\"，故是\"替代品\"。⚠️ 名词搭配 a substitute for sth；动词搭配 substitute A for B。","substitute for / a substitute teacher / no substitute for"),
 ("outline","/ˈaʊtlaɪn/","n. 提纲，大纲；v. 概述，勾勒；列举","He outlined the three phases of the rollout on a blank whiteboard.","他在空白白板上勾勒出推广的三个阶段。","词根 —— out（在外）+ line（线，同 underline / headline）——\"沿着外圈画一条线\"，就是勾勒出的骨架与提纲。⚠️ 形容词 outline 作\"提要的\"时读 /ˈaʊtlaɪn/。","an outline of / outline the main points / a brief outline"),
 ("frost","/frɔːst/","n. 霜，霜冻；v. 结霜，覆以霜","Frost covered the windscreen of the car in the early morning.","清晨的霜覆满了汽车挡风玻璃。","词根 —— 与 freeze 同族（冻结）——\"空气中的水汽在夜里冻成的那层白\"。⚠️ 拼写是 -rost 不是 -ost；frostbite 冻伤。","a heavy frost / frost covers / frosty morning"),
 ("thaw","/θɔː/","v.（冰）融化，解冻；n. 融化；缓和","The frozen lake finally thawed after two weeks of mild weather.","连续两周的温和天气后，冻湖终于开始融化。","联想 —— 词源不确定，联想更可靠：想象冰面上裂开一道缝，冻住的水开始流动。⚠️ 形容词 thawed（已解冻的）；名词 a thaw 指\"解冻期\"。","the ice begins to thaw / thaw out / a political thaw"),
 ("vineyard","/ˈvɪnjərd/","n. 葡萄园（尤指酿酒用的葡萄种植园）","We walked through the vineyard rows while the grapes were still ripening.","葡萄还在成熟的时候，我们穿行在葡萄园的行垄间。","词根 —— vine（葡萄藤）+ yard（地块，同 backyard / orchard）——\"种葡萄藤的一块地\"。⚠️ 与 garden 不同：vineyard 专指酿酒葡萄园。","a wine vineyard / vineyard rows / tour a vineyard"),
 ("harvest","/ˈhɑːrvɪst/","n. 收获，收成；收获期；v. 收割，采收","The orchard harvest was lighter this year because of the late frost.","因为那场晚霜，今年果园的收成比往年少。","词根 —— 中古英语 hervest（收获）——\"把成熟的东西从枝头收进仓里\"。⚠️ 动词可直接带宾语：harvest the crops。","harvest crops / a bumper harvest / harvest season"),
 ("bakery","/ˈbeɪkəri/","n. 面包店，糕点店","The bakery around the corner opens at six every morning.","拐角那家面包店每天早上六点开门。","词根 —— bake（烘烤，同 baked / baker）+ ery（场所，同 brewery / grocery）——\"一个烤面包的地方\"。⚠️ bakery 是店，baker 是人（面包师）。","a corner bakery / the bakery opens at"),
 ("crust","/krʌst/","n. 面包外壳，硬壳；地壳","Cut the crusts off the bread and feed them to the birds.","把面包皮切下来喂鸟。","联想 —— 词源不确定，联想更可靠：想象一块烤好的面包最外面那层硬硬的壳，掰开时\"咔\"地裂开。⚠️ 与 crunch（咬碎声）同音近形，别混。","a golden crust / the crust of the earth / cut the crusts off"),
 ("antique","/ænˈtiːk/","adj. 古董的，古老的；n. 古董，古玩","The clock on the mantelpiece is a genuine antique from the 1920s.","壁炉台上的那座钟是 1920 年代的真古董。","词根 —— anti（对抗，同 ancient / antiquity）——\"老到需要与现代作对\"，故指年代久远、有收藏价值之物。⚠️ antique 指百年以上的真古董，泛指\"老旧的\"应用 old-fashioned 或 vintage（11-07 已用）。","a genuine antique / antique furniture / an antique dealer"),
 ("courtesy","/ˈkɜːrtəsi/","n. 礼貌，谦恭；礼貌的行为；好意","He showed the courtesy of waiting until we had sat down.","他很有礼貌地等到我们坐下才开口。","词根 —— 拉丁 courte（宫廷的，同 court / courtier）——\"宫廷式的礼数\"，故是礼貌。⚠️ 固定搭配 by courtesy of（经…的好意／因为）。","by courtesy of / as a courtesy / a courtesy call"),
 ("hospitality","/ˌhɑːspɪˈtæləti/","n. 好客，热情待客；款待","Their hospitality made the whole trip feel like staying with friends.","他们的热情好客让整趟旅行像住在朋友家里一样。","词根 —— hosp（主人，同 hospital / host / hotel）+ ity——\"主人待客之道\"，故是热情款待。⚠️ 不要与 hospital（医院）混：hospital 侧重\"照护\"。","warm hospitality / extend hospitality / hospitality industry"),
]

WORK, LIFE = NEW[:11], NEW[11:]

ANCHOR = {
 "approach":("ap + pro（向前）→ 朝前走的一条路","an approach to sth"),
 "conclude":("con + clude（关门）→ 关门定论","conclude that..."),
 "confirm":("con + firm（钉牢）→ 钉牢成事实","confirm a booking"),
 "contribute":("con + tribute（给予）→ 一起给出去","contribute to sth"),
 "distribute":("dis + tribute（给予）→ 拆开分给多方","distribute to sb"),
 "estimate":("掂量出一个大概数","a rough estimate"),
 "infer":("in + fer（往里带）→ 从线索推出","infer from sth"),
 "monitor":("mon（警告）+ itor（观察者）→ 预警的观察者","monitor progress"),
 "overlap":("over + lap（覆盖）→ 一层盖一层","overlap with"),
 "substitute":("sub + stitute（放置）→ 放到位置上","a substitute for sth"),
 "outline":("out + line（线）→ 沿外圈画线","an outline of"),
 "frost":("夜里水汽冻成的白霜","a heavy frost"),
 "thaw":("冰面裂开、冻水开始流动","the ice begins to thaw"),
 "vineyard":("vine + yard（地块）→ 种葡萄藤的地","vineyard rows"),
 "harvest":("把成熟的东西收进仓里","a bumper harvest"),
 "bakery":("bake + ery（场所）→ 烤面包的地方","a corner bakery"),
 "crust":("掰开时“咔”裂开的硬壳","the crust of the earth"),
 "antique":("老到要与现代作对","a genuine antique"),
 "courtesy":("宫廷式的礼数","by courtesy of"),
 "hospitality":("hosp（主人）+ ity → 主人待客之道","warm hospitality"),
}

DIFF = [
 ("approach / method / way","approach 是“有思路的路径”（an approach to sth / take a different approach）；method 偏“可执行的具体方法”；way 最口语。⚠️ approach 名词重音在后 /əˈproʊtʃ/。"),
 ("conclude / close / end","conclude 是“得出结论”或“正式收尾”（conclude a meeting / conclude that...）；close 只是“关上、结束”；end 最泛。"),
 ("confirm / conform / confess","confirm 是“确认、证实”（confirm a booking）；conform 是“符合规范”（conform to the standard，11-05 已用）；confess 是“承认、坦白”，语境偏负面。"),
 ("contribute / distribute","contribute 是“贡献出”（contribute to a project）；distribute 是“分发给多方”（distribute the leaflets）。⚠️ 介词搭配不同：contribute **to**，distribute **to** / **among**。"),
 ("estimate / assess / evaluate","estimate 偏“给出一个大概数字”（estimate the cost）；assess 偏“评估现状、评定”（assess the damage，11-02 已用）；evaluate 偏“综合评价优劣”（evaluate performance，11-09 已用）。"),
 ("infer / imply / deduce","infer 是“读者/说话者从线索推出”（infer from the data）；imply 是“作者话里暗含”（the data implies...）；deduce 是“由已知推出确定结论”（deduce a conclusion，11-06 已用）。⚠️ 学术写作常考 infer 与 imply 的施动者差别。"),
 ("monitor / supervise / observe","monitor 是“持续看数据、盯指标”（monitor progress）；supervise 是“监督下属干活”（supervise staff，10-26 已用）；observe 是“观察并记录现象”。"),
 ("overlap / duplicate / conflict","overlap 是“部分重叠、边界交叠”（overlap with）；duplicate 是“完全重复、多余的”；conflict 是“相互冲突、矛盾”（a conflict of interest）。"),
 ("substitute / replace / exchange","substitute 是“用备用品顶上”（substitute for sb / a substitute teacher）；replace 多指“换掉旧的”；exchange 是“互换、交换”（exchange contacts）。⚠️ substitute for 中介词是 for。"),
 ("outline / summary / abstract","outline 是“骨架式提纲”（an outline of the talk）；summary 是“全文压缩后的摘要”；abstract 是“论文最前面的那段摘要”。"),
 ("frost / fog / dew","frost 是“地面与物体表面结的霜”（a heavy frost）；fog 是“悬浮的浓雾”；dew 是“清晨叶上的露珠”（heavy dew）。⚠️ 三者常在天气类阅读同篇出现。"),
 ("thaw / melt / dissolve","thaw 特指“冰冻的东西解冻”（the ice thaws）；melt 泛指“固体受热熔化”（butter melts）；dissolve 指“溶解、消散”（salt dissolves in water）。"),
 ("vineyard / orchard / garden","vineyard 是“酿酒葡萄园”；orchard 是“果树园”（apple orchard）；garden 是“一般花园、菜园”（kitchen garden）。⚠️ harvest 最常搭配 orchard。"),
 ("bakery / canteen / bakery goods","bakery 是“卖面包糕点的店”；canteen 是“食堂、饮品店”（a staff canteen）；bread 是“面包”本身。⚠️ bake / baker / bakery 是同一族三档。"),
 ("crust / peel / rind","crust 是“面包烤出的硬壳”（the crust of the earth 是地壳）；peel 是“果皮可剥层”（orange peel）；rind 是“瓜果硬皮”（melon rind）。"),
 ("antique / vintage / old-fashioned","antique 指“百年以上、真有收藏价值的古董”（a genuine antique）；vintage 指“某一特定年份的经典佳品”（vintage wine，11-07 已用）；old-fashioned 指“思想或款式过时”（old-fashioned ideas）。"),
 ("courtesy / hospitality / politeness","courtesy 是“礼节性的小举动”（as a courtesy / by courtesy of）；hospitality 是“主人待客的热情款待”（warm hospitality）；politeness 最泛，偏日常“有礼貌”。⚠️ by courtesy of 是固定搭配。"),
]

WORK_STORY = '早上你推开办公室的门，箭头指向门内——这是 **approach**（接近、着手），也是**方法**；会议室白板上红线圈出唯一一条结论线，旁边文件夹合上——这是 **conclude**（得出结论、结束）；墙上日历那一格被打上粗粗的对勾——这是 **confirm**（确认、证实）；三位同事各推一块不同颜色积木进同一座塔——这是 **contribute**（贡献）；行政把许多小包裹分装进纸箱，贴好胶带送到各组——这是 **distribute**（分发）；桌上摊着报价单和计算器，你写下“约六周”——这是 **estimate**（估计）；侦探墙上的红线把照片线索连到一张粗体结论卡——这是 **infer**（推断）；看板上几条彩色曲线在爬升，主管盯着屏幕——这是 **monitor**（监控）；两张透明胶片叠起来，中间那块形状压在一起——这是 **overlap**（重叠）；机器上一个零件被拆下，旁边那个一模一样的新件顶上——这是 **substitute**（替代）；最后你在空白白板上只画了几个空框和箭头——这是 **outline**（提纲、勾勒）。加上两位同事相视一笑握手的 **colleagues**，一天的职场线就此闭环。'
LIFE_STORY = '清晨你推开车门，挡风玻璃上结了一层白 **frost**（霜）；护栏边的冰块裂开一道缝，冻住的水开始流动——这是 **thaw**（融化）；你走进山坡上排列整齐的 **vineyard**（葡萄园），藤上的果子在秋日阳光下转深；篮子被成熟的果子装满，这是 **harvest**（收成、采收）；街角 **bakery**（面包店）的橱窗里摆满金黄的面包，你掰开一块，硬硬的 **crust**（外壳）“咔”地裂开；店里那座铜座钟是件 **antique**（古董）；主人迎上来替你拉开门、双手递上名片，礼数周全是 **courtesy**（礼貌）；门廊灯笼亮起，一杯热茶递到客人手里——这是 **hospitality**（好客、款待）；再抬头，**sunrise** 正越过屋脊，**orchard** 里的果树挂满苹果，最后 **tea** 在木桌上冒着热气。'
WORK_CHAIN = '> 画面链：推门与箭头 → 红线圈出的结论线 → 日历上的对勾 → 三块积木叠塔 → 分装纸箱 → 计算器与报价单 → 红线连到结论卡 → 爬升的曲线看板 → 两张重叠的透明片 → 拆下的零件与顶上来的备件 → 白板上的空框箭头 → 两位同事握手。'
LIFE_CHAIN = '> 画面链：车窗白霜 → 裂开的冰块 → 山坡葡萄园 → 装满果子的篮子 → 面包店橱窗 → 掰裂的金黄外壳 → 铜座钟 → 拉门与名片 → 灯笼下的热茶 → 屋脊上的日出 → 挂果的果树 → 木桌上的两杯茶。'

IMG_REL_WS = '场景配图/gpt-image-2.5-flare-20261112-daily1112.png'
PERIOD = '11-12'
ISSUE = 22

def is_data_row(c):
    """表头/分隔行不算数据行"""
    if len(c) < 2: return False
    if c[0] in ('单词','---'): return False
    if set(c[0]) <= set('-: '): return False
    return True

# ================= 1. 复习窗口 =================
p = os.path.join(BASE, '每日20词-复习窗口.md')
lines = open(p, encoding='utf-8').read().split('\n')

for i, l in enumerate(lines[:12]):
    if l.startswith('modified:'):
        lines[i] = 'modified: 2026-11-12'
        break

for i, l in enumerate(lines[:30]):
    if l.startswith('## 总索引'):
        lines[i] = f'## 总索引（{420+20} 词，按字母排序）'
        break

tbl_start = next(i for i, l in enumerate(lines) if l.startswith('## 总索引'))
hdr_i = next(i for i in range(tbl_start, len(lines)) if lines[i].startswith('| 单词 | 音标'))
sep_i = hdr_i + 1
end_i = sep_i
while end_i + 1 < len(lines) and lines[end_i+1].startswith('|'):
    end_i += 1

data_rows = []
for i in range(sep_i+1, end_i+1):
    c = [x.strip() for x in lines[i].strip().strip('|').split('|')]
    if is_data_row(c): data_rows.append(c)

print('原有数据行:', len(data_rows))
assert len(data_rows) == 420, f'期望 420，实际 {len(data_rows)}'

for w, ipa, mean, _, _, _, _ in NEW:
    data_rows.append([w, ipa, mean, PERIOD])

data_rows.sort(key=lambda r: r[0].lower())
words = [r[0] for r in data_rows]
assert len(words) == len(set(words)), '总索引有重复词'
assert words == sorted(words, key=str.lower), '总索引有逆序'
assert len(words) == 440, len(words)

new_table = ['| ' + ' | '.join(r) + ' |' for r in data_rows]
lines = lines[:hdr_i+2] + new_table + lines[end_i+1:]
print('新总索引行数:', len(new_table))

def entry(n, t):
    w, ipa, mean, ex, tr, tip, coll = t
    return f"{n}. **{w}** {ipa} {mean} -- {ex}（{tr}）记忆提示：{tip} 搭配：{coll}。"

sec = []
sec.append(f'## 2026-11-12（第 {ISSUE} 期）')
sec.append('')
sec.append('> 职场 11 + 生活 9；避开历史 420 词。配图已生成（2.5 Flare，1672 × 941，55.60 秒），本通道无法读图，尚未做视觉验收；画面仅用于联想，词义以正文为准。')
sec.append('')
sec.append(f'![场景记忆图]({IMG_REL_WS})')
sec.append('')
sec.append('### 职场篇')
sec.append('')
for i, t in enumerate(WORK, 1):
    sec.append(entry(i, t))
sec.append('')
sec.append('### 生活篇')
sec.append('')
for i, t in enumerate(LIFE, 12):
    sec.append(entry(i, t))
sec.append('')
sec.append('#### 11-12 助记卡（词根/联想抓手 + 高频搭配）')
sec.append('')
sec.append('（词根/联想抓手 + 高频搭配）')
sec.append('')
sec.append('| 单词 | 词根/画面抓手 | 高频搭配 |')
sec.append('|---|---|---|')
for w, _, _, _, _, _, _ in NEW:
    a, c = ANCHOR[w]
    sec.append(f'| {w} | {a} | {c} |')
sec.append('')
sec.append('#### 11-12 记忆宫殿 · 双线场景故事')
sec.append('')
sec.append('### 职场线（11 词）· 从推门进办公室到白板收尾的一天')
sec.append('')
sec.append(WORK_STORY)
sec.append('')
sec.append(WORK_CHAIN)
sec.append('')
sec.append('### 生活线（9 词）· 霜晨到乡村厨房的四季一天')
sec.append('')
sec.append(LIFE_STORY)
sec.append('')
sec.append(LIFE_CHAIN)
sec.append('')
sec.append('#### 11-12 排雷台（17 组易混与搭配辨析）')
sec.append('')
sec.append('（17 组易混与搭配辨析）')
sec.append('')
sec.append('| 辨析 | 关键差别与常见搭配 |')
sec.append('|---|---|')
for a, b in DIFF:
    sec.append(f'| {a} | {b} |')
sec.append('')
sec.append('#### 11-12 四轮复习节奏')
sec.append('')
sec.append('| 轮次 | 时间 | 做什么 |')
sec.append('|---|---|---|')
sec.append('| 第 1 轮 | 11-12 晚 | 看图回想 20 词及搭配 |')
sec.append('| 第 2 轮 | 11-13 | 遮住中文复述词义，完成主文件 5 题自测 |')
sec.append('| 第 3 轮 | 11-14 | 回看 17 组辨析，用难词造句 |')
sec.append('| 第 4 轮 | 11-19 | 双线故事串记，复查 20 个搭配 |')
sec.append('')
sec.append('---')
sec.append('')

ins = next(i for i, l in enumerate(lines) if l.startswith('## 2026-'))
lines = lines[:ins] + sec + lines[ins:]
open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('复习窗口已更新，行数:', len(lines))

# ================= 2. 已推荐单词索引 =================
p2 = os.path.join(BASE, '已推荐单词索引.md')
t2 = open(p2, encoding='utf-8').read()
assert '### 2026-11-12' not in t2, '当日索引已存在，停止追加'
work_words = ', '.join(w for w, *_ in WORK)
life_words = ', '.join(w for w, *_ in LIFE)
block = (f'### 2026-11-12（第 {ISSUE} 次）\n'
         f'{work_words},\n{life_words}\n\n')
t2 = t2.replace('## 执行记录', block + '## 执行记录', 1)

rec = ('- 2026-11-12（第 22 期）：避开历史 420 词，新增职场 11（approach/conclude/confirm/contribute/distribute/estimate/infer/monitor/overlap/substitute/outline）'
       '+ 生活 9（frost/thaw/vineyard/harvest/bakery/crust/antique/courtesy/hospitality），含美音、双语例句、分「词根/联想」标注的记忆提示、双线记忆宫殿故事、17 组辨析及 5 题折叠自测；'
       '**image25-flare 一次成功（55.60 秒，1672 × 941，`gpt-image-2.5-flare-20261112-daily1112.png`，原图保留、副本已 `cp -n` 归档至 场景配图/）**；'
       '复习窗口总索引扩至 440 词（纯字母序整体重排，0 重复 0 逆序）、新增 11-12 小节置顶，frontmatter modified 改为 2026-11-12；两索引集合一致，历史小节完整保留。\n')
t2 = t2.rstrip('\n') + '\n' + rec
open(p2, 'w', encoding='utf-8').write(t2)
print('已推荐单词索引已更新')
print('DONE')
