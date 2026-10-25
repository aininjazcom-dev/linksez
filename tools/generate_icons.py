"""Create dependency-free PNG fallbacks for the SVG PWA mark."""
import struct
import zlib
from pathlib import Path


def inside_polygon(x, y, points):
    odd = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            odd = not odd
        j = i
    return odd


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)


def make(size):
    rows = bytearray()
    for py in range(size):
        rows.append(0)
        for px in range(size):
            x = (px + .5) / size
            y = (py + .5) / size
            dx = max(abs(x - .5) - .27, 0)
            dy = max(abs(y - .5) - .27, 0)
            outer = dx * dx + dy * dy <= .23 * .23
            left = .23 <= x <= .35 and .19 <= y <= .65
            foot = inside_polygon(x, y, [(.28,.54),(.51,.54),(.51,.66),(.40,.66),(.28,.78),(.22,.72)])
            bookmark = inside_polygon(x, y, [(.49,.42),(.75,.42),(.78,.46),(.78,.80),(.64,.70),(.50,.80),(.46,.76),(.46,.47)])
            cutout = inside_polygon(x, y, [(.57,.50),(.69,.50),(.69,.66),(.63,.62),(.57,.66)])
            white = (left or foot or bookmark) and not cutout
            rows.extend((255,255,255,255) if white and outer else (15,16,15,255) if outer else (0,0,0,0))
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b'')
    (Path('public/icons') / f'icon-{size}.png').write_bytes(data)


if __name__ == '__main__':
    for dimension in (192, 512):
        make(dimension)
