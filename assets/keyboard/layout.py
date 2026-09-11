PITCH = 0.019
WIDTH = 0.308
DEPTH = 0.118
KEY_HEIGHT = 0.0047


def key(label, units=1, tone='dark', secondary=None):
    return {'label': label, 'units': units, 'tone': tone, 'secondary': secondary}


ROWS = [
    [key('esc', tone='orange')] + [key(f'F{i}', tone='light' if i <= 4 or i >= 9 else 'dark', secondary=icon) for i, icon in enumerate(
        ['sun-low', 'sun', 'windows', 'grid', 'keys-low', 'keys', 'previous', 'play', 'next', 'mute', 'volume-low', 'volume'], 1)]
    + [key('capture'), key('delete'), key('light')],
    [key('`', secondary='~')] + [key(str(i % 10), tone='light', secondary=s) for i, s in enumerate('!@#$%^&*()', 1)]
    + [key('-', tone='light', secondary='_'), key('=', tone='light', secondary='+'), key('backspace', 2), key('page up')],
    [key('tab', 1.5)] + [key(c, tone='light') for c in 'QWERTYUIOP']
    + [key('[', tone='light', secondary='{'), key(']', tone='light', secondary='}'), key('\\', 1.5, secondary='|'), key('page down')],
    [key('caps lock', 1.75)] + [key(c, tone='light') for c in 'ASDFGHJKL']
    + [key(';', tone='light', secondary=':'), key("'", tone='light', secondary='"'), key('enter', 2.25), key('home')],
    [key('shift', 2.25)] + [key(c, tone='light') for c in 'ZXCVBNM']
    + [key(',', tone='light', secondary='<'), key('.', tone='light', secondary='>'), key('/', tone='light', secondary='?'), key('shift', 1.75), key('up'), key('end')],
    [key('control', 1.25), key('option', 1.25), key('command', 1.25), key('space', 6.25, tone='light'),
     key('command'), key('fn'), key('control'), key('left'), key('down'), key('right')],
]


def keys():
    result = []
    for row, items in enumerate(ROWS):
        assert sum(item['units'] for item in items) == 16
        cursor = -8 * PITCH
        for column, item in enumerate(items):
            x = cursor + item['units'] * PITCH / 2
            z = (row - 2.5) * PITCH
            result.append({**item, 'row': row, 'column': column, 'x': x, 'z': z,
                           'y': 0.0136 - z * 0.055, 'id': f'{row + 1:02d}_{column + 1:02d}'})
            cursor += item['units'] * PITCH
    assert len(result) == 84
    return result
