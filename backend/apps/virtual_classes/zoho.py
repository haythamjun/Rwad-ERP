"""
عميل Zoho Meeting — مركز البيانات السعودي (zoho.sa).

المصادقة عبر Self Client: refresh token دائم في الإعدادات يُبدَّل بـ access token
(صالح ساعة) ويُخزَّن مؤقتًا في الكاش. الصلاحيات المطلوبة (مُتحقَّق منها فعليًا):
ZohoMeeting.meeting.ALL, ZohoMeeting.recording.ALL, ZohoMeeting.manageOrg.READ,
ZohoMeeting.meetinguds.READ, ZohoFiles.files.READ — آخر اثنتين شرط لتحميل ملف
التسجيل، وبدونهما يرجع رابط التحميل 401/403.
"""
import json
import shutil
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.cache import cache

_TOKEN_CACHE_KEY = 'zoho_meeting_access_token'
_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


class ZohoError(Exception):
    pass


def is_configured():
    return bool(
        settings.ZOHO_CLIENT_ID and settings.ZOHO_CLIENT_SECRET
        and settings.ZOHO_REFRESH_TOKEN and settings.ZOHO_ORG_ID
    )


def _request(method, url, data=None, headers=None, form=False, timeout=30):
    headers = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
        else:
            body = json.dumps(data).encode()
            headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            content = r.read()
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        raise ZohoError(f'Zoho {method} {url.split("?")[0]} → {e.code}: {e.read()[:300]!r}') from e
    except urllib.error.URLError as e:
        raise ZohoError(f'تعذّر الاتصال بـ Zoho: {e.reason}') from e


def _access_token():
    token = cache.get(_TOKEN_CACHE_KEY)
    if token:
        return token
    res = _request('POST', f'{settings.ZOHO_ACCOUNTS_URL}/oauth/v2/token', {
        'refresh_token': settings.ZOHO_REFRESH_TOKEN,
        'client_id':     settings.ZOHO_CLIENT_ID,
        'client_secret': settings.ZOHO_CLIENT_SECRET,
        'grant_type':    'refresh_token',
    }, form=True)
    token = res.get('access_token')
    if not token:
        raise ZohoError(f'فشل تجديد رمز Zoho: {res}')
    # أقل من الساعة بهامش أمان
    cache.set(_TOKEN_CACHE_KEY, token, int(res.get('expires_in', 3600)) - 300)
    return token


def _auth():
    return {'Authorization': f'Zoho-oauthtoken {_access_token()}'}


def _api(path):
    return f'{settings.ZOHO_MEETING_URL}/api/v2/{settings.ZOHO_ORG_ID}{path}'


def _format_start(dt):
    """Zoho يطلب صيغة 'Nov 03, 2026 07:00 PM' بتوقيت المنطقة المرسلة."""
    local = dt.astimezone(ZoneInfo(settings.TIME_ZONE))
    return (f'{_MONTHS[local.month - 1]} {local.day:02d}, {local.year} '
            f'{local.strftime("%I:%M")} {"AM" if local.hour < 12 else "PM"}')


def create_meeting(topic, starts_at, duration_minutes, presenter_id=None):
    res = _request('POST', _api('/sessions.json'), {'session': {
        'topic':     topic[:200],
        'presenter': presenter_id or settings.ZOHO_PRESENTER_ID,
        'startTime': _format_start(starts_at),
        'duration':  duration_minutes * 60 * 1000,
        'timezone':  settings.TIME_ZONE,
    }}, headers=_auth())
    return res.get('session', res)


def update_meeting(meeting_key, topic, starts_at, duration_minutes, presenter_id=None):
    res = _request('PUT', _api(f'/sessions/{meeting_key}.json'), {'session': {
        'topic':     topic[:200],
        'presenter': presenter_id or settings.ZOHO_PRESENTER_ID,
        'startTime': _format_start(starts_at),
        'duration':  duration_minutes * 60 * 1000,
        'timezone':  settings.TIME_ZONE,
    }}, headers=_auth())
    return res.get('session', res)


def delete_meeting(meeting_key):
    _request('DELETE', _api(f'/sessions/{meeting_key}.json'), headers=_auth())


def get_meeting(meeting_key):
    res = _request('GET', _api(f'/sessions/{meeting_key}.json'), headers=_auth())
    return res.get('session', res)


def list_recordings():
    """كل تسجيلات الحساب — لاستيراد التسجيلات القديمة."""
    url = f'{settings.ZOHO_MEETING_URL}/meeting/api/v2/{settings.ZOHO_ORG_ID}/recordings.json'
    return _request('GET', url, headers=_auth()).get('recordings', [])


def meeting_recordings(meeting_key):
    try:
        res = _request('GET', _api(f'/recordings/{meeting_key}.json'), headers=_auth())
    except ZohoError as e:
        if '→ 404' in str(e):
            return []
        raise
    return res.get('recordings', [])


def download_recording(download_url):
    """يحمّل ملف التسجيل على دفعات لملف مؤقت (التسجيل الواحد قد يتجاوز 300MB)
    ويرجع كائن الملف المفتوح — المستدعي مسؤول عن إغلاقه."""
    req = urllib.request.Request(download_url, headers=_auth())
    tmp = tempfile.TemporaryFile()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            if not (r.headers.get('Content-Type') or '').startswith('video/'):
                raise ZohoError(f'رد غير متوقع من Zoho: {r.headers.get("Content-Type")}')
            shutil.copyfileobj(r, tmp, length=1024 * 1024)
    except urllib.error.HTTPError as e:
        tmp.close()
        raise ZohoError(f'فشل تحميل التسجيل → {e.code}') from e
    except Exception:
        tmp.close()
        raise
    tmp.seek(0)
    return tmp


def join_window(starts_at, duration_minutes):
    """النافذة اللي يُسمح فيها بالدخول: قبل البداية بـ 10 دقائق إلى نهاية الحصة + 15 دقيقة."""
    return (starts_at - timedelta(minutes=10),
            starts_at + timedelta(minutes=duration_minutes + 15))
