#!/usr/bin/env python3
"""Reproduce the explicitly assumed pipeline/BHT/Cache models in the report.

Standard-library only. This is a teaching-model simulation, not an RTL test.
Run from any directory: python3 homework/体系结构习题报告/verify.py
"""
import json
from fractions import Fraction
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def pipeline(n, forwarding=False, predict_taken=False):
    """Single issue, five stages, branch resolves in EX, WB precedes ID read.

    Execute the actual three-instruction program, including wrong-path fetches.
    The ID predictor redirects next-cycle fetch; an EX mispredict flushes F/D.
    Completion means the final branch has passed WB (uniform five-stage rule).
    """
    regs = 0
    pc = 0
    uid = 0
    nodes = []
    retired = []
    stalls = 0
    redirects = 0

    def fetch(address):
        nonlocal uid
        if address not in (0, 1, 2):
            return None
        uid += 1
        node = {"uid": uid, "pc": address, "trace": {}, "prediction": False}
        nodes.append(node)
        return node

    stages = [fetch(0), None, None, None, None]
    pc = 1
    cycle = 0
    while cycle < 30 * n + 100:
        cycle += 1
        f, d, e, m, w = stages
        for name, node in zip("FDEMW", stages):
            if node is not None:
                node["trace"][cycle] = name

        if w is not None:
            if w["pc"] != 2:
                regs = w["result"]
            retired.append(w)
            if w["pc"] == 2 and not w["taken"]:
                assert regs == 0
                break

        mispredict = False
        actual_next = None
        if e is not None:
            operand = e["operand"]
            if forwarding and e["pc"] != 0:
                # Prefer the youngest older result: MEM, then WB, then RF.
                operand = regs
                if m is not None and m["pc"] != 2:
                    operand = m["result"]
            if e["pc"] == 0:
                e["result"] = n
            elif e["pc"] == 1:
                e["result"] = operand - 1
            else:
                e["taken"] = operand != 0
                actual_next = 1 if e["taken"] else 3
                mispredict = e["taken"] != e["prediction"]

        hazard = bool(d is not None and d["pc"] != 0 and not forwarding
                      and any(x is not None and x["pc"] != 2 for x in (e, m)))
        new = [None, None, None, e, m]
        if mispredict:
            redirects += 1
            new[0] = fetch(actual_next)
            pc = actual_next + 1
        elif hazard:
            stalls += 1
            d["trace"][cycle] = "D*"
            if f is not None:
                f["trace"][cycle] = "F*"
            new[0], new[1] = f, d
        else:
            new[2] = d
            if d is not None:
                d["operand"] = regs
            if d is not None and d["pc"] == 2 and predict_taken:
                d["prediction"] = True
                new[0] = fetch(1)
                pc = 2
            else:
                new[1] = f
                new[0] = fetch(pc)
                pc += 1
        stages = new
    else:
        raise AssertionError("Pipeline did not terminate")

    assert len(retired) == 2 * n + 1
    assert sum(x["pc"] == 2 and x["taken"] for x in retired) == n - 1
    assert sum(x["pc"] == 1 for x in retired) == n
    for idx, node in enumerate(retired):
        node["label"] = "I" if idx == 0 else ("D" if idx % 2 else "B") + str((idx + 1) // 2)
    return {"cycles": cycle, "raw_stalls": stalls, "ex_redirects": redirects,
            "retired": len(retired), "prefix": retired[:7]}


def bht(invocations, taken_per_invocation, bits):
    state = 0
    misses = 0
    accesses = 0
    for _ in range(invocations):
        for actual in [1] * taken_per_invocation + [0]:
            prediction = state if bits == 1 else int(state >= 2)
            misses += prediction != actual
            accesses += 1
            if bits == 1:
                state = actual
            else:
                state = max(0, min(3, state + (1 if actual else -1)))
    return {"accesses": accesses, "misses": misses,
            "accuracy": str(Fraction(accesses - misses, accesses)),
            "percent": 100 * (accesses - misses) / accesses}


def timing_svg(name, title, rows, end):
    left, top, cell, height = 80, 68, 53, 44
    width = left + cell * end + 20
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{top + height * len(rows) + 45}" viewBox="0 0 {width} {top + height * len(rows) + 45}">',
           '<rect width="100%" height="100%" fill="white"/>',
           '<g font-family="Noto Sans CJK SC, sans-serif" font-size="17">',
           f'<text x="16" y="26" font-size="21" font-weight="bold">{escape(title)}</text>']
    colors = {"F": "#dbeafe", "D": "#dcfce7", "E": "#ffedd5", "M": "#ede9fe", "W": "#cffafe"}
    for c in range(1, end + 1):
        out.append(f'<text x="{left + (c - .5)*cell}" y="55" text-anchor="middle">{c}</text>')
    for i, row in enumerate(rows):
        y = top + i * height
        out.append(f'<text x="12" y="{y + 27}">{escape(row["label"])}</text>')
        for c in range(1, end + 1):
            x = left + (c - 1) * cell
            val = row["trace"].get(c, "")
            fill = "#fee2e2" if "*" in val else colors.get(val, "#ffffff")
            out.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{height}" fill="{fill}" stroke="#cbd5e1"/>')
            out.append(f'<text x="{x + cell/2}" y="{y + 27}" text-anchor="middle">{escape(val)}</text>')
    out.extend(['</g>', '</svg>'])
    (ROOT / "figures" / name).write_text("\n".join(out) + "\n", encoding="utf-8")


def main():
    (ROOT / "figures").mkdir(exist_ok=True)
    # Exhaustively vary the loop bound over a small range; verify the closed forms.
    for n in range(1, 31):
        plain = pipeline(n)
        fwd = pipeline(n, forwarding=True)
        pred = pipeline(n, forwarding=True, predict_taken=True)
        assert plain["cycles"] == 6 * n + 5
        assert plain["raw_stalls"] == 2 * (n + 1)
        assert fwd["cycles"] == 4 * n + 3
        assert pred["cycles"] == 3 * n + 4
        assert pred["ex_redirects"] == 1

    results = {"assumptions": {"branch_resolution": "EX", "wb_before_id_read": True,
                "completion": "final branch passes WB", "bht_initial_state": 0,
                "bht_aliasing": False, "dual_issue_same_packet_raw": False},
               "dynamic_instructions": 201, "taken_branches": 99,
               "multicycle": {"alu_cycles": 4, "branch_cycles": 3, "total": 704},
               "pipeline": {"no_forwarding": pipeline(100),
                            "forwarding": pipeline(100, True),
                            "id_predict_taken": pipeline(100, True, True)},
               "bht": {}}
    for trips, key in [(9, "bottom_test"), (10, "top_test_taken_to_body")]:
        results["bht"][key] = {}
        for bits in (1, 2):
            records = {label: bht(count, trips, bits) for label, count in
                       [("inner", 100), ("middle", 10), ("outer", 1)]}
            total = sum(x["accesses"] for x in records.values())
            misses = sum(x["misses"] for x in records.values())
            records["total"] = {"accesses": total, "misses": misses,
                                "accuracy": str(Fraction(total - misses, total)),
                                "percent": 100 * (total - misses) / total}
            assert misses == (222 if bits == 1 else 117)
            results["bht"][key][str(bits)] = records
    results["cache"] = [{"ways": w, "sets": 512 // w,
                          "offset": 6, "index": (512 // w).bit_length() - 1,
                          "tag": 32 - 6 - ((512 // w).bit_length() - 1)} for w in (1, 2, 4)]
    for x in results["cache"]:
        assert (1 << x["index"]) * x["ways"] * 64 == 32768
        assert x["tag"] + x["index"] + x["offset"] == 32
    results["performance"] = {"base_cpi": 1, "cpi_1": 7, "cpi_2": 3,
                               "time_2_over_1": "10/21", "speedup_2_over_1": "21/10",
                               "equal_base_cpi": 34}
    assert Fraction(3, 1) / (Fraction(9, 10) * 7) == Fraction(10, 21)
    assert [results["pipeline"][k]["cycles"] for k in
            ("no_forwarding", "forwarding", "id_predict_taken")] == [605, 403, 304]
    for record in results["pipeline"].values():
        assert record["retired"] == 201
    for key, name, title in [("no_forwarding", "q2.svg", "Q2: no forwarding (first three iterations)"),
                              ("forwarding", "q3.svg", "Q3: EX forwarding (first three iterations)"),
                              ("id_predict_taken", "q7.svg", "Q7: ID predicts taken (first three iterations)")]:
        rows = results["pipeline"][key]["prefix"]
        timing_svg(name, title, rows, max(max(x["trace"]) for x in rows))
    rows = []
    c = 1
    for name, seq in [("I", "FDEW")] + [(x + str(i), s) for i in range(1, 4) for x, s in [("D", "FDEW"), ("B", "FDE")]]:
        rows.append({"label": name, "trace": dict(zip(range(c, c + len(seq)), seq))})
        c += len(seq)
    timing_svg("q1.svg", "Q1: multicycle (first three iterations)", rows, c - 1)
    rows = results["pipeline"]["forwarding"]["prefix"]
    # Two-wide front end: dependent members of a fetched pair issue separately.
    dual_rows = []
    for row in rows:
        tr = {c: s for c, s in row["trace"].items() if s != "F"}
        if row["label"] == "D1":
            tr.update({1: "F", 2: "D*"})
        elif row["label"] == "B1":
            tr.update({2: "F", 3: "D*"})
        elif row["label"].startswith("B"):
            f = min(c for c, s in row["trace"].items() if s == "F")
            tr.update({f - 1: "F", f: "D*"})
        else:
            tr.update({c: s for c, s in row["trace"].items() if s == "F"})
        dual_rows.append({"label": row["label"], "trace": tr})
    timing_svg("q5.svg", "Q5: two-wide front end; no same-packet RAW issue", dual_rows, 15)
    # Preserve semantic order: this chain cannot issue dependent ALU/branch pairs.
    assert all(sum(r["trace"].get(c) == "E" for r in dual_rows) <= 1 for c in range(1, 16))
    results["dual_issue_cycles"] = results["pipeline"]["forwarding"]["cycles"]
    (ROOT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS: 90 five-stage pipeline simulations (loop bounds 1..30)")
    print("PASS: loop bound 100: multicycle 704; no-forward 605; forward 403; dual 403; prediction 304")
    print("PASS: BHT state-machine simulation; bottom-test: 1110 branches, misses 222 / 117")
    print("PASS: Cache field partition and CPI/time calculations")
    print("Wrote results.json and five SVG timing diagrams")


if __name__ == "__main__":
    main()
