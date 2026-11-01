# Runtime art

Generated with the built-in imagegen tool on 2026-11-01, using the project's approved cube-voxel reference boards as visual style guidance. These are actual scene/sprite assets rather than screenshots of game UI. No real lottery or bank logos are used.

Original selected PNGs and the main generation prompt set are preserved in `.research/lotto-life-art/`. Runtime WebPs are in `public/assets/`; machine-readable sizes and ordering are in `public/assets-manifest.json`.

| File | Pixels | Layout |
| --- | --- | --- |
| characters-male.webp | 1600 × 960 | 5 columns × 2 rows; 320 × 480 cells; M01–M10 |
| characters-female.webp | 1600 × 960 | 5 columns × 2 rows; 320 × 480 cells; F01–F10 |
| room.webp | 1600 × 900 | Empty apartment background |
| street.webp | 1600 × 900 | Empty neighborhood lottery-shop street |
| bank.webp | 1600 × 900 | Empty fictional bank lobby |
| endings.webp | 1600 × 1024 | 5 columns × 4 rows; 320 × 256 cells; E01–E20 |

The six runtime images total 1,289,108 bytes. WebP conversion used Sharp quality 86 and alpha quality 100. Character PNG and WebP files both have actual alpha channels; transparency was requested from imagegen, not simulated with a checkerboard or flat background. Nonsemantic resizing normalized output dimensions to exact integer grids.

## Cropping

IDs run left-to-right, then top-to-bottom. Use `background-size: 500% 200%` for characters and `500% 400%` for endings. For a zero-based index `i`, horizontal background position is `(i % 5) * 25%`. Character vertical position is `floor(i / 5) * 100%`; ending vertical position is `floor(i / 5) * 100 / 3%`. Preserve the 2:3 cell ratio for character boxes and 5:4 for ending scene boxes. A differently shaped element stretches CSS background cells.

Do not auto-trim whole atlases or remove their transparent padding. All heads, hands, and shoes are inside their runtime cell crop. The generation repair made F06 smaller to protect both raised hands; this is a known visual scale variation. Raw transparent-image previews may exaggerate hidden RGB in near-zero-alpha pixels. Diagnostic composites of the final WebPs over cream were inspected and show clean contours without visible rectangular backgrounds or colored debris. These diagnostic composites are preserved outside the public runtime directory. Runtime scenes have open lower-center areas for the character/dialog overlay, though dense ending desk scenes have less open floor space.

## Character identities

M01 green overshirt; M02 cream hoodie; M03 blue varsity jacket; M04 denim jacket; M05 navy/yellow tracksuit; M06 coral sweatshirt; M07 silver hair/glasses/charcoal sweater; M08 white overshirt/olive pants; M09 blue puffer vest; M10 olive jacket.

F01 black bob/green overshirt; F02 long black hair/cream hoodie; F03 brown ponytail/denim jacket; F04 brown curls/blue cardigan; F05 black pixie/navy jacket; F06 twin braids/coral sweatshirt; F07 silver bob/glasses/lavender cardigan; F08 red-brown bun/brown jacket; F09 black waves/red plaid; F10 brown bob/teal cardigan.

## Ending mapping

| ID | Environment |
| --- | --- |
| E01 | Cozy house interior |
| E02 | Cleared bills / tidy paper desk |
| E03 | Savings phone / piggy bank, no rising investment graph |
| E04 | House front |
| E05 | Home and wrapped family gift |
| E06 | Unbranded car showroom |
| E07 | Airport terminal |
| E08 | Seaside hotel room |
| E09 | Hobby / gaming room |
| E10 | Classroom |
| E11 | Office exit and moving box |
| E12 | Park bench |
| E13 | Small cafe exterior |
| E14 | Vegetable garden |
| E15 | Creative studio |
| E16 | Riverside walking trail |
| E17 | Empty pet bed and bowl |
| E18 | Donation desk with clothes and toys |
| E19 | Korean restaurant table |
| E20 | Empty city bus interior |

## Verification and repair history

All six original images were visually inspected. The initial character outputs were too close to cell edges; both atlases were regenerated with padding, F06 received a targeted size repair, and both atlases received an imagegen alpha cleanup pass. Selected PNG originals were copied into the workspace. Sharp metadata confirmed output dimensions and true alpha; all six final WebPs were reopened for visual inspection, followed by alpha-compositing QA. The ending atlas has no people, cell labels, frames, or gutters. The bank, street, and room backgrounds have no people or interface elements.
