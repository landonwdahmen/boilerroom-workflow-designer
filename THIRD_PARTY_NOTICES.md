# Third-party notices and asset provenance

November 1, 2026. These notices identify **third-party components only**. They do not apply an MIT, Apache or other first-party license to Boiler-Room, its original four-person team work, its documentation or the 2026 modernization. See [README.md](README.md#publication-licensing-and-acknowledgments) for the source-available portfolio scope and attribution.

## Verified license texts

The files below are unmodified copies of verified installed licenses or immutable source-project references. Identical text is stored once and explicitly mapped to each matching package/version; every grouped installed copy was byte-compared. Packages are declared dependencies, not a claim that every declaration is actively imported or that dependency binaries are included in this source-only edition.

| Components / exact versions | Verified license/notice | Unmodified text |
| --- | --- | --- |
| @heroicons/react 2.2.0 | MIT | [heroicons-react-2.2.0-LICENSE.txt](third-party-notices/heroicons-react-2.2.0-LICENSE.txt) |
| react 19.0.0; react-dom 19.0.0 | MIT | [react-19.0.0-LICENSE.txt](third-party-notices/react-19.0.0-LICENSE.txt) |
| react-router-dom 7.18.5; react-router 7.18.5 | MIT | [react-router-dom-7.18.5-LICENSE.txt](third-party-notices/react-router-dom-7.18.5-LICENSE.txt) |
| @dnd-kit/core 6.3.1; @dnd-kit/sortable 10.0.0; @dnd-kit/utilities 3.2.2 | MIT | [dnd-kit-core-6.3.1-LICENSE.txt](third-party-notices/dnd-kit-core-6.3.1-LICENSE.txt) |
| axios 1.21.0 | MIT | [axios-1.21.0-LICENSE.txt](third-party-notices/axios-1.21.0-LICENSE.txt) |
| web-vitals 2.1.4 | Apache-2.0 | [web-vitals-2.1.4-LICENSE.txt](third-party-notices/web-vitals-2.1.4-LICENSE.txt) |
| reactflow 11.11.4; @reactflow/background 11.3.14; @reactflow/controls 11.2.14; @reactflow/core 11.11.4; @reactflow/minimap 11.7.14; @reactflow/node-resizer 2.2.14; @reactflow/node-toolbar 1.3.14 | MIT | [reactflow-11.11.4-LICENSE.txt](third-party-notices/reactflow-11.11.4-LICENSE.txt) |
| Heroicons copied search SVG 1.0.6 | MIT | [heroicons-v1.0.6-LICENSE.txt](third-party-notices/heroicons-v1.0.6-LICENSE.txt) |
| BCrypt.Net-Next 4.0.3 | MIT | [BCrypt.Net-Next-4.0.3-LICENSE.txt](third-party-notices/BCrypt.Net-Next-4.0.3-LICENSE.txt) |
| BCrypt upstream jBCrypt origin notice 0.4 reference | Upstream permission notice as supplied | [BCrypt-jBCrypt-origin-LICENSE.txt](third-party-notices/BCrypt-jBCrypt-origin-LICENSE.txt) |

The copied member-search SVG in `TDS-Frontend-main/src/components/dashboard/admin/MemberList.jsx` matches [Heroicons v1.0.6](https://github.com/tailwindlabs/heroicons/blob/v1.0.6/optimized/solid/search.svg). Its supplied MIT notice names **2020 Refactoring UI Inc.** The installed v2.2.0 license names **Tailwind Labs, Inc.** Both are preserved; the newer credit is not substituted for the copied older artwork. Earlier uncertain chevron/spinner SVG implementations were replaced with already installed, licensed Heroicons v2 components; historical originals remain private. React Flow attribution configuration remains unchanged.

For npm components, package versions were checked against the unchanged lock and license files read directly from those installed versions. This is not a new registry-signature or package-provenance certification. No dependency version changed.

## Exact-version legacy NuGet findings

**BCrypt.Net-Next 4.0.3: source-project license verified.** Official tag `4.0.3` resolves to commit `2dcc0c99874e43fe3b1b98bfc35cfd974d44cf48`. Its [package project](https://github.com/BcryptNet/bcrypt.net/blob/2dcc0c99874e43fe3b1b98bfc35cfd974d44cf48/src/BCrypt.Net.MainPackage/BCrypt.Net.Package.csproj) explicitly identifies PackageId BCrypt.Net-Next and Version 4.0.3; its [license text](https://github.com/BcryptNet/bcrypt.net/blob/2dcc0c99874e43fe3b1b98bfc35cfd974d44cf48/licence.txt) is the MIT copy linked above, preserving Damien Miller, Ryan D. Emerle and Chris McKee attribution. The same source tree's [jBCrypt reference notice](https://github.com/BcryptNet/bcrypt.net/blob/2dcc0c99874e43fe3b1b98bfc35cfd974d44cf48/assets/jBCrypt-0.4/LICENSE) is also copied unmodified as origin evidence; Java reference code is not vendored. This closes the exact-version source-license-text evidence gap, not a complete binary/supply-chain certification. The installed legacy nuspec's moving URL remains unchanged.

**xunit.abstractions 2.0.3: unresolved exact license text.** Official [tag 2.0.3](https://github.com/xunit/abstractions.xunit/tree/489a2b3949a9ae8587201a22a8ecfc1d791fa1f3) resolves to commit `489a2b3949a9ae8587201a22a8ecfc1d791fa1f3`. Its complete tree has no license text; its [nuspec](https://github.com/xunit/abstractions.xunit/blob/489a2b3949a9ae8587201a22a8ecfc1d791fa1f3/xunit.abstractions.nuspec) retains version 2.0.1 and a moving xunit/master license URL. AssemblyInfo identifies .NET Foundation copyright and a deliberately frozen assembly version; it supplies no license grant. These facts do not establish the exact 2.0.3 license text. No current-branch Apache/MIT text has been substituted, and no license absence is inferred. Keep this issue open before redistributing that package artifact or claiming complete notice verification.

**M7C.1 published-package follow-up, November 1, 2026:** the [specific NuGet listing](https://www.nuget.org/packages/xunit.abstractions/2.0.3), original published package and [NuGet catalog record](https://api.nuget.org/v3/catalog0/data/2026.04.10.00.22.07/xunit.abstractions.2.0.3.json) were inspected. The published nuspec correctly identifies **2.0.3** (unlike the version-matched source-tree nuspec above), but provides only the mutable `https://raw.githubusercontent.com/xunit/xunit/master/license.txt` URL, no license expression or license file. Its eleven ZIP entries contain dependency DLL/XML files, metadata and a repository signature; no embedded LICENSE/NOTICE text. The catalog records publication on **August 26, 2018**, the same URL, and no license expression. Current Apache-2.0 descriptions/links are corroborating current-project evidence, not a recovered immutable 2018 package license text. The exact-text finding therefore remains explicitly unresolved; no license is fabricated or dependency upgraded.

The package archive SHA-256 is `d03d72fc2df8880448f7a81bddb00e1bcb5c18f323c7e7cc69b4cfa727469403`. The installed SDK's NuGet PackageArchiveReader computes the package content hash matching the unchanged test lock; signed-archive SHA-512 and NuGet content hashes are deliberately distinguished. The proposed clean **source-only** edition contains test dependency references/lock metadata, **no xunit.abstractions DLL, nupkg or copied source**. Locally restored verification binaries are private generated output. Before any distribution of that dependency artifact, verify its applicable terms and preserve the actual required license/NOTICE/attribution. This disposition does not claim a complete dependency-binary notice review or a first-party license grant. No GitHub account or repository operation was used in this follow-up; prior public upstream evidence was reused locally.

Other backend pins have verified installed nuspec expressions: Npgsql 9.0.3 declares [PostgreSQL](https://licenses.nuget.org/PostgreSQL); Microsoft.Extensions.Hosting.WindowsServices 10.0.14 declares [MIT](https://licenses.nuget.org/MIT). Those cache directories did not supply standalone notice texts in this review. Backend/test/helper package references are not an application-license grant or a vendored DLL distribution. The prior 45-entry NuGet metadata inventory remains distinct from this selected notice pack.

## Original neutral mark and retained history

`TDS-Frontend-main/src/logo.svg` is the editable neutral graph mark authored from basic vector geometry during the November 1, 2026 individual portfolio follow-up. No font, sponsor art, commercial mark or external image was used to create it. Local Sharp **0.35.5**, already available outside the project's dependency graph, rendered its 192/512 PNGs; the favicon packs rendered PNG frames at 16/24/32/64 pixels. No package was installed or upgraded. The manifest and HTML title consistently identify **Boiler-Room — Workflow Design Demo**; the short manifest label is Boiler-Room.

| Current file | SHA-256 |
| --- | --- |
| TDS-Frontend-main/src/logo.svg | `db2940ef42db6ab44544bc1b3413f92309f3fb67a74c7ee4225e9fd8ba7c02af` |
| TDS-Frontend-main/public/logo192.png | `58968a39ef6ed4b2e9f35c47ac7c1cb1574d52f0962da4b1d26c4b26c0e3001a` |
| TDS-Frontend-main/public/logo512.png | `efcfe60983327ea47a79b76ccff83765499fabab63b373a87b15df6a421609df` |
| TDS-Frontend-main/public/favicon.ico | `4719a5c1a2ca80cc65cdcf9ecc55c30fa3d33f4f286d87590e837afb97910a62` |

The committed SVG uses LF line endings. Its original workspace CRLF bytes have SHA-256 `f7602c748a37cb5688a778257fca353d46e942f061d83c4b5082c5a50352c572`; normalizing that line ending produces the committed checksum above with identical SVG text. This records byte normalization, not regenerated artwork or a licensing change. The PNG and ICO bytes are unchanged.

Historical CRA assets, original metadata, terms and other pre-change files are preserved under ignored `.local/m7b3/before` with a SHA-256 baseline; earlier upstream identity evidence is retained privately. They are not part of a proposed public export. This provenance statement does not select a first-party license or assert exclusive ownership of the original team project. Existing portfolio screenshots retain their dated actual-application provenance; no screenshot was reconstructed or changed for branding.

## Distribution boundaries and remaining review

This notice pack covers the listed verified texts and copied/icon material; it is **not a complete artifact-wide compliance certification**. Source-only references/locks differ from distributing node_modules, compiled binaries, installers or built JS/CSS. Preserve relevant copyright/permission and supplied NOTICE requirements for whatever is actually redistributed. Generated directories and private evidence remain excluded from the proposed source edition.

The unchanged graph still contains lightningcss 1.33.0 plus platform packages declaring MPL-2.0, and caniuse-lite 1.0.30001819 declaring CC-BY-4.0. Their installed license evidence was reviewed in M7B.2. If their covered code/binaries/data are redistributed, apply their actual source/notice/attribution obligations; build-tool use does not automatically relicense the application's separate files. The present pack does not claim to settle every transitive or future binary-distribution requirement. Test/SDK dependencies retain their own terms; xunit.abstractions remains explicitly unresolved.

Public author contacts retained inside unmodified third-party licenses are attribution supplied by those authors, not application/customer records. Do not strip required copyright text to make a pattern scan report fewer matches. Complete exact-export selection, privacy/security scanning, remaining notices review and separate publication authorization before release. No first-party LICENSE has been created.
