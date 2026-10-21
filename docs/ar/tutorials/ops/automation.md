---
title: أتمتة التشغيل
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [الأتمتة, سكربتات-النسخ, systemd, cron, Ansible, CI/CD, التشغيل]
updated: 2026-10-04
draft: false
---

هدف أتمتة التشغيل ليس «أن تبدو محترفًا»، بل **تحويل الأفعال المتكرّرة إلى أفعال لا تُنسى ولا تُخطئ**. فأكثر أسباب حوادث الخوادم ليس «التقنية صعبة»، بل «نسيت أن أفعل هذا» و«نسيت خطوة عند تنفيذه آخر مرة» و«يدي ارتجفت وأنا أنفّذه في الثالثة فجرًا».

وتوضّح هذه المقالة كيف تُسلَّم النسخ الاحتياطي وإعادة التشغيل والتحديث وتنظيف السجلات وفحص الصحة إلى سكربتات ومؤقّتات، و**أي الأمور لا يجوز تسليمها إليها**. والمقالات ذات الصلة: استراتيجية النسخ في [النسخ الاحتياطي والاستعادة](/tutorials/java/backup) و[النسخ الاحتياطي خارج الموقع](/tutorials/ops/offsite-backup)، ومشكلات الأداء في [تحليل أداء الخادم بـ spark](/tutorials/ops/spark)، وعملية التحديث في [تحديثات الخادم والملحقات وMCDR وصيانتها](/tutorials/ops/updates)، والتنبيهات في [المراقبة والتنبيهات](/tutorials/ops/monitoring).

:::warn الأوامر والإعداد تتبع التوثيق الرسمي لنظامك وبرمجياتك
**أسماء الحزم والمسارات والمستخدمين والمجموعات وأسماء الخدمات ووسائط الوحدات وخيارات systemd** أدناه كلها تتغيّر بحسب **التوزيعة وإصدار البرمجيات وطريقة التثبيت**. والأمثلة تبيّن «ما يُكتب ولماذا يُكتب هكذا»، **وليست منتجًا جاهزًا للنسخ واللصق**. فقبل التطبيق راجع توثيق توزيعتك، والتوثيق الرسمي للخادم والملحقات، والأدلة الرسمية لـ Ansible وsystemd وcron (`man 5 crontab`، و`man systemd.timer`، و`man systemd.service`).
:::

## 1. ما الذي تُؤتمته أولًا

المعيار بسيط: **هل هذا الفعل يحتاج تكرارًا بحسب الزمن؟** فإن كان نعم فهو يستحق الأتمتة؛ وإن لم يكن فلا تمسّه الآن.

| المهمة | التكرار | طريقة الأتمتة | الخطر |
| --- | --- | --- | --- |
| نسخ العالم والإعداد | يوميًا / كل 6 ساعات | cron أو systemd timer + سكربت | منخفض (لكن **نسخة لم تُتحقَّق كنسخة غير موجودة**) |
| المزامنة خارج الموقع | يوميًا | `rsync` + مفاتيح SSH | متوسط (امتلاء الهدف أو الكتابة فوقه) |
| إعادة التشغيل المجدولة | يوميًا / أسبوعيًا | cron أو systemd timer | منخفض (لكن **إعادة التشغيل ليست علاج التقطيع**) |
| تنظيف السجلات وتدويرها | يوميًا / أسبوعيًا | `logrotate` أو سكربت | متوسط (حذف دليل خاطئ لا رجعة فيه) |
| فحص الصحة والشفاء الذاتي | كل دقيقة / كل 5 دقائق | سكربت + مؤقّت + تنبيه | متوسط (**إعادة التشغيل المتكرّرة تُخفي المشكلة الحقيقية**) |
| فحص التحديثات (إشعار فقط) | يوميًا | سكربت + إشعار | منخفض |
| تنفيذ التحديث (مع التراجع) | بتدخّل بشري | سكربت + تأكيد بشري | **عالٍ** (يعدّل ملفات تنفيذ وإعداد) |
| ترقية الملحقات | بشري | التحقق في خادم اختبار أولًا | **عالٍ** (صيغة الإعداد والتبعيات تتغيّر) |
| ترقية نسخة اللعبة | بشري | بحسب تعليمات الترقية الرسمية | **الأعلى** (صيغة العالم قد تتغيّر باتجاه واحد) |
| حذف الأرشيف، وتفريغ بيانات اللاعبين، وإعادة ضبط العالم | لا تُؤتمت أبدًا | يُسمح بالتنفيذ البشري فقط | **غير قابل للتراجع** |

والخلاصة: **تتركّز قيمة الأتمتة في الأفعال «منخفضة الخطر وعالية التكرار والميكانيكية»**؛ وكلما ارتفع الخطر، وجب استخدام الأتمتة في «الفحص والتحضير والتحقّق والتراجع»، لا في «التنفيذ المباشر».

## 2. ما لا يجوز أتمتته على العمياء

**ترقية نسخة اللعبة.** فالترقية عبر إصدار رئيسي تصحبها غالبًا **تحويلات باتجاه واحد لصيغة بيانات العالم**. فبمجرد أن يفتح الإصدار الجديد العالم ويحفظه، لا يبقى الرجوع إلى الإصدار القديم ممكنًا عادةً. وهذه العمليات يجب أن يؤكّدها إنسان، و**بنسخة احتياطية أولًا، وتجربة على نسخة أولًا**.

**ترقية ملحق لم تُجرَّب.** فتبعيات الملحقات (مثل Vault وPlaceholderAPI وProtocolLib وLuckPerms) وصيغ الإعداد تتغيّر بحسب النسخة. والنهاية النمطية للترقية التلقائية: يكتمل التحديث ليلًا، وفي الصباح لا يدخل اللاعبون، ولا تعرف أي ملحق سبب ذلك.

**أي عملية غير قابلة للتراجع.** الحذف، والكتابة فوق الملفات، والتفريغ، والترحيل، و`rm -rf`، و`DROP` في قواعد البيانات. هذه الأفعال يمكن للسكربت أن **يجهّزها** (سرد ما سيُحذف، وتوليد قائمة بانتظار التأكيد)، لكن لا يجوز أن **ينفّذها مؤقّت مباشرةً**.

**سكربت لم تفهمه.** فنسخ shell من الإنترنت بلا فهم، مع root ومؤقّت، يعني زرع لغم لا تعرف متى ينفجر.

:::warn القوة التدميرية للأتمتة «تتضاعف تلقائيًا»
خطأ التشغيل البشري أثره تلك المرة؛ وخطأ الأتمتة **يتكرّر بحسب التكرار** — فسكربت تنظيف بمسار خاطئ يحذف كل يوم، وفحص صحة بشرط معكوس يعيد التشغيل كل دقيقة. **فدع السكربت يعمل بوضع القراءة فقط مدة كافية، وتأكّد من صحة حكمه، ثم امنحه صلاحية الكتابة.**
:::

## 3. نظافة السكربت

السكربت نفسه: الفرق بين الجيد والسيئ ليس في الوظيفة، بل في **هل تفهم ما حدث عند وقوع مشكلة**.

### 3.1 ثلاثة أمور في البداية

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **الـ shebang**: `#!/usr/bin/env bash` أنقل من `#!/bin/bash` (فهو يبحث عن bash في `PATH`). **لاحظ**: `sh` لا يضمن دعم صيغة bash المستخدمة أدناه، فلا تستخدم `#!/bin/sh`.
- **`set -e`**: الخروج فور فشل أمر، تجنّبًا لـ«فشل الأمر السابق وواصلنا إلى ما بعده».
- **`set -u`**: الخطأ والخروج عند الإشارة إلى متغيّر غير معرّف. وأخطر الأخطاء أن يكون المتغيّر فارغًا فيصبح `rm -rf "$DIR/"` هو `rm -rf /`.
- **`set -o pipefail`**: فشل أي حلقة في الأنبوب يُعدّ فشلًا. فبدونه قد يُعدّ خطأ tar في `tar ... | gzip ...` نجاحًا.

### 3.2 السجل ورمز الخروج والتكرارية

**يجب أن يحمل السجل طابعًا زمنيًا، ولا يكفي `echo`**: فالسجل بلا طابع زمني قليل القيمة في التشخيص، فلا تعرف هل «فشل النسخ» اليوم أم الأسبوع الماضي.

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

وإن كان السكربت مُدارًا بـ systemd فيمكنك عدم إضافة طابع زمني بنفسك والاعتماد على `journalctl` (فيه طابع زمني وتدوير)، **لكن لا تخلط الطريقتين**.

**ورموز الخروج يجب أن تكون ذات معنى**: `0` نجاح، وغير الصفر فشل، مع **التمييز بين أسباب الفشل**، ليكون للتنبيه معنى — `1` خطأ عام، و`2` خطأ استخدام، و`3` تبعية مفقودة، و`4` القفل محتجز (السابق ما زال يعمل)، و`5` فشل تحقّق البيانات.

**والتكرارية (idempotency)**: السكربت التكراري يمكن تنفيذه مرارًا بنتيجة واحدة، وهذه أهم خاصية في الأتمتة — استخدم `mkdir -p` لا `mkdir`، والكتابة الاستبدالية لا الإضافية (إلا السجل)، و«افحص ثم افعل» لا «افترض أنه جاهز». **فالسكربت غير التكراري يُتلف البيانات عند الإعادة**، والإعادة أمر طبيعي (إعادة تشغيل الجهاز، وتنفيذ cron المتأخّر، وتشغيلك اليدوي مرة أخرى).

### 3.3 علامات التنصيص و`--dry-run` وإدارة النسخ

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

واكتب المتغيّرات `"$VAR"` لا `$VAR`، وإلا انقسم المسار الذي فيه مسافة إلى عدة وسائط؛ و`${VAR:?message}` **يخطئ ويخرج مباشرةً** حين يكون المتغيّر فارغًا أو غير معرّف، وهو أرخص تأمين ضد الحذف الخاطئ. وإضافة وضع «اطبع ولا تنفّذ» إلى السكربت أرخص إجراء أمان.

**والسكربتات تدخل إدارة النسخ**: ضع السكربتات في مستودع Git، والسبب ليس «المعيارية»، بل أنك ترى **ما تغيّر آخر مرة**، ومتى بدأت المشكلات بعد التغيير؛ ويمكن استعادة المحذوف؛ وتتشارك عدة خوادم السكربت نفسه بدل أن يتطوّر عندها ثلاث نسخ متباينة قليلًا. ويجب أن يضمّ المستودع السكربتات ووحدات systemd ومقاطع cron وملفات Ansible، وREADME يوضّح التبعيات، **ولا يضمّ أبدًا مفاتيح** (انظر القسم 9).

## 4. سكربت نسخ احتياطي كامل

هذا السكربت يستخدم كل المبادئ السابقة: **ملف قفل يمنع التداخل، وRCON لإيقاف كتابة الأرشيف، وأرشيف بتاريخ، وتحقّق، وسياسة احتفاظ، ومزامنة خارج الموقع**.

```bash
#!/usr/bin/env bash
set -euo pipefail
# سكربت نسخ احتياطي لخادم Minecraft (Linux). الاستخدام: ./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # تركه فارغًا يعني عدم استخدام RCON
OFFSITE_TARGET=""                           # مثال: backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# فحوص مسبقة
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "الأمر مفقود:$cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "دليل الخادم غير موجود:$SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "مضبوط RCON لكن مفقود mcrcon" 3
fi
# القفل: منع التداخل إن لم تنتهِ المرة السابقة
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "تعذّر إنشاء ملف القفل:$LOCK" 3
if ! flock -n 9; then log WARN "نسخة سابقة ما زالت تعمل، سنتخطى هذه المرة"; exit 4; fi
# أعِد كتابة الأرشيف مهما كان سبب الخروج
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on فشل، تأكّد يدويًا من استعادة كتابة الأرشيف"
  fi
}
trap cleanup EXIT
log INFO "بدء النسخ:${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"

# 1) أوقف الحفظ التلقائي (يُفضّل RCON؛ وبدونه يمكن الإرسال بـ screen، مثل
#    screen -S minecraft -p 0 -X stuff 'save-off\n'، ثم تذكّر إرسال save-on بعدها)
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "تم تنفيذ save-off و save-all flush"; sleep 5
  else
    log WARN "RCON غير متاح، وسنتخطى save-off، ونواصل النسخ"
  fi
else
  log WARN "لم يُضبط RCON، وسنتخطى save-off"
fi

# 2) تأكّد من وجود أدلة العالم، تجنّبًا لأرشيف فارغ
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "تخطّي دليل غير موجود:${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "لا يوجد أي دليل عالم، سنتوقّف" 5
# 3) الضغط (استخدم pigz إن وُجد للضغط المتوازي)
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) تحقّق من قابلية قراءة الأرشيف (وهذه الخطوة تحدّد «هل النسخة موجودة»)
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "فشل تحقّق الأرشيف:$TARBALL" 5
  log INFO "نجح تحقّق الأرشيف:$(du -h "$TARBALL" | cut -f1)"
fi
# 5) سياسة الاحتفاظ والحدّ الأدنى للمساحة
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "المساحة المتبقية ${FREE_GB}G أقل من الحدّ ${MIN_FREE_GB}G"
# 6) المزامنة خارج الموقع (فشل rsync يعيد غير صفر، ومع set -e يظهر مباشرةً)
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "المزامنة إلى خارج الموقع:${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "اكتمل النسخ:${TARBALL}"
```

والتصميم الأساسي: **`flock -n 9`** يتيح تخطّي المرة إذا لم تنتهِ السابقة، بدل تنفيذ نسختين بالتوازي وإشباع القرص وI/O؛ و**`trap cleanup EXIT`** يضمن محاولة `save-on` مهما كان سبب خروج السكربت، وإلا **بقي الخادم لا يكتب على القرص**، وهو حادث خفيّ جدًا؛ و**`sleep 5` بعد `save-all flush`** يمنح الخادم وقتًا لكتابة المناطق من الذاكرة؛ و**التحقّق بـ`tar -tzf`** هو المعيار الوحيد لـ«هل النسخة صالحة»؛ و**`--delete-after`** ينقل بنجاح ثم يحذف القديم، تجنّبًا لإفراغ الموقع الخارجي عند فشل النقل؛ و**`${STATE_DIRECTORY:-/run/lock}`** متوافق مع `StateDirectory=` في systemd (انظر 4.2)، ويرجع إلى `/run/lock` عند التشغيل اليدوي.

:::tip نفّذ «تجربة استعادة» دوريًا
نجاح السكربت يوميًا لا يعني صلاحية النسخة. فكل فترة **فكّها فعلًا في جهاز اختبار أو دليل مؤقت وشغّلها مرة**. وعملية الاستعادة في [النسخ الاحتياطي والاستعادة](/tutorials/java/backup)، ومعنى النسخة خارج الموقع في [النسخ الاحتياطي خارج الموقع](/tutorials/ops/offsite-backup).
:::

### 4.1 صيغة cron المقابلة

```ini
# /etc/cron.d/mc-backup
# دقيقة ساعة يوم شهر أسبوع   المستخدم        الأمر
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**بيئة cron مختلفة تمامًا عن shell الذي تسجّل الدخول إليه**: فـ`PATH` قصير، و`HOME` قد لا يكون ما تظنّ، فيجب ضبط `SHELL` و`PATH` صراحةً في crontab، واستخدام مسارات مطلقة في السكربت قدر الإمكان؛ **ويجب إعادة التوجيه `>> log 2>&1`**، وإلا ذهبت المخرجات إلى البريد (وكثير من الأجهزة بلا نظام بريد أصلًا، أي ثقب أسود)؛ وملفات `/etc/cron.d/` **تحتاج حقل اسم المستخدم**، أما `crontab -e` فيكتب جدول المستخدم الحالي **بلا حقل اسم مستخدم**، وهذا أكثر خطأ صياغي في cron شيوعًا؛ و**cron لا «يعوّض» المهام الفائتة**، فإن أُغلق الجهاز في 4:30 لم تحدث تلك النسخة.

### 4.2 المكافئ بـ systemd timer + service

```ini
# /etc/systemd/system/mc-backup.service
[Unit]
Description=Minecraft world backup
After=network-online.target

[Service]
Type=oneshot
User=minecraft
Group=minecraft
StateDirectory=mcbackup
StateDirectoryMode=0750
# يحتاج السكربت إلى قراءة دليل الخادم والكتابة في دليل النسخ
ReadWritePaths=/srv/minecraft/server /srv/backups/mc
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ExecStart=/opt/mc-ops/mc-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/mc-backup.timer
[Unit]
Description=Run Minecraft world backup every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:30:00
# إن كان الجهاز مطفأً عند نقطة الإطلاق، يعوّضها مرة بعد الإقلاع
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mc-backup.timer
systemctl list-timers mc-backup.timer
journalctl -u mc-backup.service -n 50 --no-pager
```

ونقطتان يسهل الخطأ فيهما: **أيام الأسبوع والشهور في `OnCalendar` تُكتب باختصارات إنجليزية** (`Mon`، و`Sun`، و`Jan`)، والوقت يُفسَّر افتراضيًا بالتوقيت المحلي، ويتغيّر وقت الإطلاق بعد تغيير التوقيت (والصيغة في `man systemd.time`)؛ و**`ProtectSystem=strict` يجعل نظام الملفات كله للقراءة فقط**، والمسارات القابلة للكتابة هي `StateDirectory` و`CacheDirectory` و`LogsDirectory` و`RuntimeDirectory` و`ReadWritePaths` المذكورة صراحةً — فإن أراد السكربت الكتابة في مكان آخر وجب إضافته، وإلا رأيت «الصلاحيات صحيحة فعلًا ولا يكتب».

:::tip كيف تختار بين cron وsystemd timer
إن كان الأمر «سكربت يعمل كل يوم»: كلاهما يصلح، فاختر ما تعرفه أكثر. وإن احتجت **تجميع السجلات، والتعويض بعد الإقلاع، وتقييد الموارد، وإعادة المحاولة عند الفشل**: فاختر systemd timer. وإن احتجت **الاتساق عبر التوزيعات** (مع BSD والحاويات): فـ cron أعمّ.
:::

## 5. إعادة التشغيل المجدولة

إعادة التشغيل المجدولة عملية يومية في كثير من الخوادم، لكن يجب التوضيح أولًا: **إعادة التشغيل ليست علاج التقطيع.** فما تعالجه هو تسريب الذاكرة البطيء، والحالات المؤقتة المتراكمة من التشغيل الطويل، وخلل صغير في ملحق؛ و**لا** تعالج TPS المنخفض، ولا بطء تحميل المناطق، ولا تقطيع اللاعبين — وتلك تحتاج بحثًا عن السبب، انظر [تحليل أداء الخادم بـ spark](/tutorials/ops/spark)؛ و«ينهار كل يوم لذلك نعيد التشغيل كل يوم» يجعل **العطل الحقيقي لا يُكتشف أبدًا**.

وعند التأكد من الحاجة إلى إعادة تشغيل مجدولة، يجب أن تتضمّن العملية **إعلانًا مسبقًا**:

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # الأأمن أن يُقرأ من ملف محدود الصلاحية أو من متغيّر بيئة
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say سيُعاد تشغيل الخادم بعد 5 دقائق، فيرجى حفظ تقدّمك"
sleep 240
rcon "say سيُعاد تشغيل الخادم بعد 1 دقيقة"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "إعادة تشغيل ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# الملف الأول: /etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# الملف الثاني: /etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

وإن كنت تستخدم لوحة (Pterodactyl أو AMP أو MCSManager وغيرها)، **فاستخدم جدولة إعادة التشغيل في اللوحة بالأولوية**، لأن اللوحة تعرف كيف توقف العملية بلطف؛ واستخدام سكربت يقتل عملية تديرها اللوحة قد يخلط حالة اللوحة. ومقارنة اللوحات في [لوحة الخادم](/tutorials/ops/panels).

:::warn لا تستخدم kill -9 لإيقاف الخادم
القتل القسري للعملية قد يجعل العالم **لا يلحق الحفظ**، أو يُقطع أثناء الكتابة. والترتيب الصحيح دائمًا: `save-all flush` ← إيقاف طبيعي (أمر `stop` أو `systemctl stop`) ← انتظار خروج العملية. ولا تفكّر في الإنهاء القسري إلا إذا تجمّدت العملية، و**افحص سلامة الأرشيف بعدها**.
:::

## 6. كيف تُؤتمت التحديثات بأمان

التحديث أعلى فئات الأتمتة خطرًا. والتصرف الممكن هو **استخدام الأتمتة في «التحضير والتحقّق»، وترك التنفيذ للتأكيد البشري**: فحص النسخة الجديدة (تلقائي، إشعار فقط) ← التنزيل إلى `staging/` (تلقائي، **بلا الكتابة فوق الـ jar العامل**) ← التحقّق من بصمة المصنّع (تلقائي) ← النسخ الاحتياطي والتأكد من قراءة الأرشيف (تلقائي) ← التبديل (بتأكيد بشري، مع إعادة تسمية الـ jar القديم للحفظ) ← إعادة التشغيل والتحقق من المنفذ والسجل وتحميل الملحقات ← وعند الفشل إرجاع الـ jar القديم و**التنبيه**.

والفاحص الذي يقوم بـ«الفحص والتنزيل» فقط أعلى الأتمتة قيمةً، لأنه بلا قوة تدميرية:

```bash
#!/usr/bin/env bash
set -euo pipefail
# فحص وتنزيل فقط، بلا استبدال ولا إعادة تشغيل
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # استبدله بالعنوان الرسمي
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # استبدله بعنوان البصمة الرسمي
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) نزّل إلى دليل التجهيز
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) تحقّق (يجب استخدام البصمة التي ينشرها المصنّع)
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "البصمة غير مطابقة، سنتخلّى عن التنزيل"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) قارن بالنسخة الحالية، وأبلغ فقط
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "هذه أحدث نسخة بالفعل"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "وُجدت نسخة جديدة، وُضعت في دليل التجهيز بانتظار تأكيد بشري للتبديل"
fi
```

**والمبدأ الأساسي: الأتمتة تتولّى «تحضير الشيء وشرحه»، والتبديل وإعادة التشغيل يضغط زرّهما إنسان.** وتفاصيل التحديث والتراجع الكاملة (مع الملحقات والمودات وMCDR) في [تحديثات الخادم والملحقات وMCDR وصيانتها](/tutorials/ops/updates).

## 7. الأتمتة المدفوعة بفحص الصحة

قيمة فحص الصحة في **اكتشاف المشكلة قبل أن يكتشفها اللاعبون**. ويجب أن يكون أساس الحكم موضوعيًا قدر الإمكان: هل العملية تعمل (`systemctl is-active`، لكن حياة العملية لا تعني صلاحية الخدمة)؛ وهل المنفذ يستمع (`nc -z` / `ss -ltn`، وهو أسرع فحص توافر)؛ وهل ما زالت تستجيب للأوامر (استعلام RCON، فالاستجابة تعني أن الخيط الرئيسي لم يتجمّد تمامًا)؛ وTPS / MSPT (**والأوامر تختلف بين الخوادم، فيجب تأكيدها من التوثيق الرسمي**)؛ والقرص والذاكرة (أنسب للتنبيه لا لـ«إعادة التشغيل التلقائية»).

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # مثال: /opt/mc-ops/notify.sh، ويستقبل وسيط رسالة
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# تهدئة: تجنّب حلقة انهيار-إعادة تشغيل
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "في فترة التهدئة، سنتخطى إعادة التشغيل التلقائية"; exit 0; fi
fi
# 1) فحص المنفذ (مهلة 3 ثوانٍ)
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "المنفذ ${PORT} لا يستجيب"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "فشلت إعادة التشغيل، يلزم تدخّل بشري"; exit 1; fi
  exit 0
fi
# 2) فحص TPS (يحتاج RCON ودعم الخادم للأمر)
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} أدنى من العتبة:${MIN_TPS} (استخدم spark للتحليل، ولا تعِد التشغيل على العمياء)"
  fi
fi
log INFO "نجح فحص الصحة"
```

```ini
# /etc/systemd/system/mc-health.timer
[Unit]
Description=Check Minecraft server health every 2 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
```

:::warn إعادة التشغيل المتكرّرة تُخفي المشكلة الحقيقية
إن كان فحص الصحة يضطرّ إلى إعادة تشغيل الخادم كل يوم، فما تحصل عليه ليس «خادمًا مستقرًّا»، بل «**خادمًا ينهار كل يوم ولا يعلم أحد**». وسكربت إعادة التشغيل التلقائية **يجب أن يرسل تنبيهًا في الوقت نفسه**، وأن تكون فترة التهدئة طويلة كفاية؛ وعند التكرار المستمر يجب **إيقاف إعادة التشغيل التلقائية والتحوّل إلى التشخيص البشري**.
:::

والطريقة الكاملة لجمع المؤشرات وضبط العتبات وقنوات التنبيه في [المراقبة والتنبيهات](/tutorials/ops/monitoring).

## 8. إدارة الإعداد: مفهوم Ansible وأصغر مثال

حين يتجاوز الخادم جهازًا واحدًا يبدأ «الدخول والتعديل اليدوي» بالخروج عن السيطرة: فتتباين إعدادات الأجهزة الثلاثة تدريجيًا، ولا تعرف أيّها الصحيح. وأدوات إدارة الإعداد (Ansible وSalt وPuppet وChef) تحلّ هذه المسألة: **كتابة الحالة المطلوبة للجهاز في ملف، وإدخالها في إدارة النسخ، ليتولّى الأداة التقارب إليها.** وAnsible أدناها عتبةً، لأنه **يحتاج SSH وPython فقط، ولا يحتاج تثبيت agent على الأجهزة المُدارة**.

```ini
# inventory.ini
[mcservers]
mc1.example.com ansible_user=deploy
mc2.example.com ansible_user=deploy

[mcservers:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# playbook.yml
---
- name: Provision a Minecraft host
  hosts: mcservers
  become: true
  vars:
    mc_user: minecraft
    mc_group: minecraft
    mc_home: /srv/minecraft
    # فروق التوزيعات: في Debian/Ubuntu الاسم عادةً openjdk-21-jre-headless،
    # وفي عائلة RHEL عادةً java-21-openjdk-headless. تحقّق إلزاميًا من توزيعتك.
    java_package: openjdk-21-jre-headless
  tasks:
    - name: Install a Java runtime
      ansible.builtin.package:
        name: "{{ java_package }}"
        state: present
    - name: Create the service user and group
      ansible.builtin.user:
        name: "{{ mc_user }}"
        group: "{{ mc_group }}"
        home: "{{ mc_home }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: true
        state: present
    - name: Deploy the systemd unit
      ansible.builtin.template:
        src: templates/minecraft.service.j2
        dest: /etc/systemd/system/minecraft.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart the server
  handlers:
    - name: Reload systemd and restart the server
      ansible.builtin.systemd:
        name: minecraft.service
        daemon_reload: true
        state: restarted
```

```bash
ansible-playbook -i inventory.ini playbook.yml --check --diff
ansible-playbook -i inventory.ini playbook.yml
```

:::warn وسائط الوحدات تتبع توثيق Ansible الرسمي
**أسماء وسائط كل وحدة من الوحدات أعلاه** (`package` و`user` و`template` و`systemd`) **وقيمها وسلوكها تتغيّر بحسب نسخة Ansible**، وقد تُعاد تسمية الوحدات أو تُنقل إلى collection في النسخ الأحدث. **ونسخ الأمثلة مصدر شائع للحوادث**: شغّل أولًا `--check` (يبلّغ ولا يعدّل)، ثم راجع معنى كل وسيط بندًا بندًا في توثيق Ansible الرسمي.
:::

وثلاث خبرات: **أحكم «الإعداد» قبل «النشر»** (فإدخال `server.properties` وإعداد الملحقات ووحدات systemd في إدارة النسخ أعلى قيمةً بكثير من جعل Ansible ينزّل لك jar)؛ و**`--check` صديقك** (فأي ملف Ansible شغّله أولًا بـ`--check --diff`)؛ و**القيم الحسّاسة لا تدخل المستودع** (كلمات المرور وToken وكلمة مرور RCON تُحقن بـ`ansible-vault` أو بمتغيّرات البيئة).

## 9. مفهوم CI/CD (ولماذا لا تدخل المفاتيح المستودع)

استخدام CI/CD على خادم Minecraft: أعلى قيمة فيه ليست «النشر التلقائي»، بل **الفحص التلقائي**. والتصرف العملي: وضع إعداد الخادم في مستودع Git، وجعل خطّ الإنتاج يقوم عند كل إرسال بثلاثة أمور — **فحص الصيغة، وتحليل البنية، والفحص الساكن للسكربتات**.

```yaml
# .github/workflows/validate.yml
name: Validate server configuration
on:
  push:
    branches: [main]
  pull_request:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v4
      - name: Lint YAML configuration
        run: |
          pip install --disable-pip-version-check yamllint
          yamllint -c .yamllint.yml config/
      - name: Parse YAML and TOML files
        run: |
          python3 - <<'PY'
          import pathlib, sys, tomllib, yaml
          parsers = {"*.yml": yaml.safe_load, "*.toml": tomllib.loads}
          failed = False
          for pattern, parse in parsers.items():
              for path in sorted(pathlib.Path("config").rglob(pattern)):
                  try:
                      parse(path.read_text(encoding="utf-8"))
                  except Exception as exc:
                      failed = True
                      print(f"{path}: {exc}")
          sys.exit(1 if failed else 0)
          PY
      - name: ShellCheck the operations scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck -x scripts/*.sh
```

:::note فرق النسخ: `tomllib` يحتاج Python 3.11+
`tomllib` لا يوجد في المكتبة القياسية إلا منذ Python 3.11. والنسخ الأقدم تحتاج تثبيت `tomli` وتغيير السطر إلى `import tomli as tomllib`. فتحقّق من بيئة تشغيلك.
:::

**وخطوة «المزامنة إلى الخادم» تحتاج حذرًا.** والترتيب الممكن: CI يتولّى **التحقّق والتغليف** فقط، والنشر يطلقه إنسان، وبنسخ احتياطي تلقائي قبل النشر. **ولا تدع كل إرسال يعيد تشغيل خادم الإنتاج مباشرةً.**

**ولا تُرسل كلمات المرور ولا Token ولا كلمة مرور RCON ولا المفتاح الخاص SSH إلى المستودع أبدًا.** وثلاث نتائج محدّدة: **تاريخ Git يحتفظ بها إلى الأبد** (فحذف الملف لا يحلّ شيئًا، فالنسخة موجودة في الإرسالات القديمة، وعند من استنسخ المستودع؛ والتخلص التامّ يحتاج إعادة كتابة التاريخ، **وتبديل كل بيانات الاعتماد المسرّبة**)؛ و**المستودعات العامة تُمسح تلقائيًا** (فهناك من يزحف على مفاتيح المستودعات العامة، وقد لا يفصل بين الإرسال وإساءة الاستخدام إلا دقائق)؛ و**تنتشر مع المستودع** (فكل استنساخ، وكل fork، وكل سجل CI قد يحمل نسخة منها).

| الحالة | التصرف |
| --- | --- |
| CI يحتاج مفتاحًا | استخدم Secrets التي تقدّمها المنصّة (مثل repository secrets في GitHub Actions)، وتحقنه عبر متغيّر بيئة |
| الخادم يحتاج مفتاحًا | ضعه في ملف محدود الصلاحية (`chmod 600`، ومالكه مستخدم الخدمة)، أو استخدم `EnvironmentFile=` في systemd |
| Ansible يحتاج مفتاحًا | شفّره بـ`ansible-vault`، أو اقرأه من متغيّر بيئة |
| التطوير المحلي | أضف الإعداد الحقيقي إلى `.gitignore`، وضع في المستودع قالب `.example` فقط |

**واستخدم أداة فحص مفاتيح (مثل gitleaks وtrufflehog) على تاريخ Git كله قبل النشر**، فهذا أرخص بكثير من المعالجة بعد وقوع المشكلة.

## 10. ترتيب التطبيق المقترح

لا تُؤتمت كل شيء دفعةً واحدة. تقدّم من الأدنى خطرًا والأعلى قيمةً: **سكربت نسخ احتياطي أولًا، مع التحقق من استعادة واحدة** (القسم 4) ← **اربط النسخ بمؤقّت**، وتأكّد من رؤية النجاح والفشل في السجل ← **أضف فحص الصحة + التنبيه** (القسم 7)، وبالتنبيه فقط دون إعادة تشغيل تلقائية ← **أضف تنظيف السجلات وتدويرها**، واضبط مساحة القرص ← **ضع السكربتات والإعداد في Git** (الأقسام 3.3 و9) ← **وأخيرًا فكّر في التحديث التلقائي**، وحتى «التنزيل + التحقّق + الإشعار» فقط (القسم 6).

:::warn عملية تدميرية تلقائية بلا نسخة احتياطية هي سيناريو ضياع الأرشيف المعياري
سكربت تنظيف بمسار خاطئ، أو `rsync --delete` باتجاه خاطئ، أو سكربت تحديث يكتب فوق ملفات العالم — القاسم المشترك في هذه الحوادث **أنه لم تكن هناك نسخة صالحة قبل وقوعها**. **وأي أتمتة تحذف أو تكتب فوق أو تنقل بيانات يجب أن تتأكد أولًا من وجود نسخة قابلة للاستعادة**؛ فإن تعذّر ذلك فلا تدعها تعمل تلقائيًا. فالأرشيف المفقود لا يُستعاد عادةً، أما السكربت فيُعاد كتابته.
:::

## الخطوات التالية

- استراتيجية النسخ وعملية الاستعادة: انظر [النسخ الاحتياطي والاستعادة](/tutorials/java/backup)
- كيف تُصنع النسخة خارج الموقع: انظر [النسخ الاحتياطي خارج الموقع](/tutorials/ops/offsite-backup)
- المؤشرات والعتبات وقنوات التنبيه: انظر [المراقبة والتنبيهات](/tutorials/ops/monitoring)
- كيف تحدّد سبب التقطيع (لا أن تعيد التشغيل): انظر [تحليل أداء الخادم بـ spark](/tutorials/ops/spark)
- العملية الكاملة للتحديث والتراجع: انظر [تحديثات الخادم والملحقات وMCDR وصيانتها](/tutorials/ops/updates)
- جدولة المهام المدمجة في اللوحة: انظر [لوحة الخادم](/tutorials/ops/panels)

---

> السكربتات والإعداد تتبع التوثيق الرسمي للنظام والبرمجيات التي تستخدمها.
