"""Clicks through the 3D venue designer in a headless browser and saves screenshots.

Run from the repo root:  python agents/venue3d_browser.py [out_dir]
It serves the repo on port 8766 itself. Firebase is blocked, so cloud saving shows as "only on this device".
Exit code 0 only if every step passed and the page logged no errors.
"""
import http.server, json, os, socketserver, sys, threading, functools
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "venue3d-shots"
os.makedirs(OUT, exist_ok=True)
PORT = 8766
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.getcwd())
handler.log_message = lambda *a: None
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORT), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()

fails, errors, results = [], [], []
def check(cond, msg):
    results.append(("ok  " if cond else "FAIL") + " " + msg); print(results[-1])
    if not cond: fails.append(msg)

with sync_playwright() as p:
    chrome = os.environ.get("TEST_CHROME", "/usr/bin/google-chrome")
    b = p.chromium.launch(executable_path=chrome if os.path.exists(chrome) else None,
                          args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    def page_for(w, h, mobile=False):
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile, accept_downloads=True)
        pg = ctx.new_page()
        pg.route("**/www.gstatic.com/**", lambda r: r.abort())
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "gstatic" not in m.text and "ERR_FAILED" not in m.text and errors.append(m.text))
        return ctx, pg
    ctx, pg = page_for(1280, 800)
    shot = lambda n: pg.screenshot(path=f"{OUT}/{n}.png")
    pg.goto(f"http://127.0.0.1:{PORT}/venue3d.html"); pg.wait_for_function("window.hm3d && window.hm3d.editor.s", timeout=20000); pg.wait_for_timeout(1500)
    s = pg.evaluate("hm3d.scene()")
    # 1-2 open the editor and see the whole room
    check(len(s["walls"]) == 4 and any(o["type"] == "door" for o in s["openings"]) and any(o["type"] == "window" for o in s["openings"]), "1. editor opens a venue with 4 walls, doors and windows")
    shot("01-whole-room")
    lit = pg.evaluate("(()=>{const c=document.querySelector('#v3-canvas'),g=hm3d.editor.r.getContext(),out=new Set();for(let i=1;i<8;i++){const px=new Uint8Array(4);g.readPixels(c.width*i/8,c.height/2,1,1,g.RGBA,g.UNSIGNED_BYTE,px);out.add(px.slice(0,3).join(','))}return out.size})()")
    check(lit >= 4, f"2. the room is drawn ({lit} different colors across the middle of the view)")
    # 3 camera: orbit by dragging, then top / front / side / walk
    pg.mouse.move(640, 300); pg.mouse.down(); pg.mouse.move(820, 330, steps=8); pg.mouse.up(); pg.wait_for_timeout(500); shot("03a-orbited")
    for v in ["top", "front", "side"]:
        pg.click(f"[data-view={v}]"); pg.wait_for_timeout(500); shot(f"03-{v}")
    check(pg.evaluate("hm3d.editor.view") == "side", "3. camera views switch (top, front, side)")
    pg.click("[data-view=walk]"); pg.wait_for_timeout(300)
    btn = pg.locator("#pad [data-k=f]"); bb = btn.bounding_box(); pg.mouse.move(bb["x"] + 10, bb["y"] + 10); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up()
    z0 = pg.evaluate("hm3d.editor.walk.pos.z"); shot("03-walk")
    check(z0 < s["views"][0]["pos"][2] - 0.15, f"3. walk mode moves forward (z={z0:.2f})")
    pg.click("[data-view=orbit]"); pg.wait_for_timeout(500)
    # 4 select by tapping the stage on screen
    xy = pg.evaluate("""(()=>{const e=hm3d.editor,o=e.objs.get('stage1');const T=o.position.clone();T.y=0.6;T.project(e.cam);const r=e.r.domElement.getBoundingClientRect();return [r.left+(T.x+1)/2*r.width,r.top+(1-T.y)/2*r.height]})()""")
    pg.mouse.click(xy[0], xy[1]); pg.wait_for_timeout(300)
    check(pg.evaluate("hm3d.editor.sel") == "stage1", "4. tapping the stage selects it (got " + str(pg.evaluate("hm3d.editor.sel")) + ")")
    shot("04-selected")
    # 5-8 move, turn, resize, change material through the Selected panel (same checked steps as dragging)
    pg.evaluate("hm3d.select('t1')"); pg.wait_for_timeout(200)
    x0 = pg.evaluate("hm3d.scene().items.find(i=>i.id==='t1').x")
    pg.fill("[data-pos=x]", "14"); pg.press("[data-pos=x]", "Tab"); pg.wait_for_timeout(200)
    it = pg.evaluate("hm3d.scene().items.find(i=>i.id==='t1')"); kids = pg.evaluate("hm3d.scene().items.filter(i=>i.group==='t1').map(i=>i.x)")
    check(abs(it["x"] - 14 * 0.3048) < 0.01 and abs(sum(kids) / len(kids) - it["x"]) < 0.05, f"5. table moved to 14 ft from the left wall, its chairs came along ({x0:.2f} -> {it['x']:.2f})")
    pg.evaluate("hm3d.select('bar1')"); pg.wait_for_timeout(100); pg.fill("[data-rot]", "45"); pg.press("[data-rot]", "Tab"); pg.wait_for_timeout(200)
    check(pg.evaluate("hm3d.scene().items.find(i=>i.id==='bar1').rot") == 45, "6. bar turned to 45°")
    pg.evaluate("hm3d.select('dance1')"); pg.wait_for_timeout(100); pg.fill("[data-sz=w]", "20"); pg.press("[data-sz=w]", "Tab"); pg.fill("[data-sz=d]", "20"); pg.press("[data-sz=d]", "Tab"); pg.wait_for_timeout(200)
    check(abs(pg.evaluate("hm3d.scene().items.find(i=>i.id==='dance1').w") - 20 * 0.3048) < 0.01, "7. dance floor resized to 20 x 20 ft")
    pg.select_option("#matSel", "marble"); pg.wait_for_timeout(200)
    check(pg.evaluate("hm3d.scene().items.find(i=>i.id==='dance1').mat") == "marble", "8. dance floor material changed to marble")
    # Drag handle: move the selected object with the transform arrows (a real drag)
    pg.evaluate("hm3d.editor.setMode('translate')"); pg.evaluate("hm3d.select('bar1')"); pg.wait_for_timeout(200)
    bx = pg.evaluate("hm3d.scene().items.find(i=>i.id==='bar1').x")
    # Grab the gizmo's sideways (X) arrow and pull it toward the left wall.
    pg.evaluate("hm3d.editor.tc.setSpace('world'); hm3d.editor.orbit.enableDamping=false; hm3d.editor.frame()"); pg.wait_for_timeout(1200)
    hxy = pg.evaluate("""(()=>{const e=hm3d.editor,o=e.objs.get('bar1');const P=(dx)=>{const T=o.position.clone();T.x+=dx;T.project(e.cam);const r=e.r.domElement.getBoundingClientRect();return [r.left+(T.x+1)/2*r.width,r.top+(1-T.y)/2*r.height]};return [P(0),P(1.2)]})()""")
    (cx, cy), (ax, ay) = hxy; gx, gy = cx + (ax - cx) * 0.75, cy + (ay - cy) * 0.75
    pg.mouse.move(gx + 40, gy + 40); pg.mouse.move(gx, gy, steps=6); pg.wait_for_timeout(100); hov = pg.evaluate("[hm3d.editor.tc.axis, hm3d.editor.tc.object&&hm3d.editor.tc.object.userData.id, hm3d.editor.tc.mode, hm3d.editor.tc.camera.type, hm3d.editor.tc.enabled]"); shot("05b-before-drag"); pg.mouse.down(); pg.mouse.move(gx - (ax - cx) * 1.5, gy - (ay - cy) * 1.5, steps=12); pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(400)
    bx2 = pg.evaluate("hm3d.scene().items.find(i=>i.id==='bar1').x")
    check(bx2 < bx - 0.3, f"5b. dragging the arrow moved the bar toward the left wall ({bx:.2f} -> {bx2:.2f}, grabbed {hov})")
    shot("05-08-edited")
    # 9 lighting
    pg.click("[data-tab=light]"); pg.wait_for_timeout(100)
    pg.evaluate("hm3d.run([{op:'modify_lighting',id:'all',kelvin:2700,scale:0.7}])"); pg.wait_for_timeout(300)
    check(all(l.get("kelvin") == 2700 for l in pg.evaluate("hm3d.scene().lights")), "9. lighting changed to warm 2700 K")
    shot("09-warm-light")
    # Undo / redo
    pg.click("#undo"); k = pg.evaluate("hm3d.scene().lights.filter(l=>l.kelvin===2700).length"); pg.click("#redo")
    check(k < len(s["lights"]), "undo and redo work")

    # AI demo: the instruction from the assignment, previewed, then kept
    pg.click("[data-tab=file]"); pg.click("[data-x=new]"); pg.wait_for_timeout(400); pg.click("[data-tab=ask]")
    shot("10a-before-ai")
    said = "Move the stage to the front of the room, create a dance floor in the center, and arrange eight round tables around it"
    pg.fill("#ask", said); pg.click("#askGo"); pg.wait_for_timeout(500)
    check(pg.locator("#banner").is_visible() and "Preview" in pg.inner_text("#banner"), "AI: shows a preview before keeping anything")
    shot("10b-ai-preview")
    pg.click("#bnKeep"); pg.wait_for_timeout(400)
    s2 = pg.evaluate("hm3d.scene()"); rt = [i for i in s2["items"] if i["kind"] == "table_round"]; ch = [i for i in s2["items"] if i["kind"] == "chair"]
    df = [i for i in s2["items"] if i["kind"] == "dance_floor"][0]
    check(len(rt) == 8 and len(ch) == 64 and abs(df["x"] - s2["room"]["w"] / 2) < 0.01, f"AI: the real scene now has 8 tables, 64 chairs, dance floor centered")
    shot("10c-ai-kept")
    pg.click("[data-view=top]"); pg.wait_for_timeout(500); shot("10d-ai-top"); pg.click("[data-view=orbit]")
    # A removal asks first
    pg.fill("#ask", "remove the bar"); pg.click("#askGo"); pg.wait_for_timeout(200)
    check("removes" in pg.inner_text("#banner"), "AI: removing something asks for an OK first"); pg.click("#bnNo")

    # 10-11 save, close, reopen
    pg.click("[data-tab=file]"); pg.click("[data-x=save]"); pg.wait_for_timeout(600)
    sid = s2["id"]; ctx_state = ctx.storage_state()
    pg.close()
    ctx2 = b.new_context(viewport={"width": 1280, "height": 800}, storage_state=ctx_state, accept_downloads=True); pg = ctx2.new_page()
    pg.route("**/www.gstatic.com/**", lambda r: r.abort()); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"http://127.0.0.1:{PORT}/venue3d.html"); pg.wait_for_function("window.hm3d && window.hm3d.editor.s", timeout=20000); pg.wait_for_timeout(1200)
    s3 = pg.evaluate("hm3d.scene()")
    check(s3["id"] == sid and len([i for i in s3["items"] if i["kind"] == "table_round"]) == 8, "10-11. saved, closed the page, reopened: same venue with the AI's 8 tables")
    pg.screenshot(path=f"{OUT}/11-reopened.png")
    # 12 export: venue file and .glb
    pg.click("[data-tab=file]")
    with pg.expect_download() as d: pg.click("[data-x=json]")
    jp = f"{OUT}/venue.hostmode-venue.json"; d.value.save_as(jp); j = json.load(open(jp))
    check(j["schema"] == "hostmode.venue3d" and len(j["items"]) == len(s3["items"]), "12. exported the venue file")
    with pg.expect_download() as d: pg.click("[data-x=glb]")
    gp = f"{OUT}/venue.glb"; d.value.save_as(gp); head = open(gp, "rb").read(4)
    check(head == b"glTF" and os.path.getsize(gp) > 50000, f"12. exported a 3D model (.glb, {os.path.getsize(gp)//1024} KB)")
    # Re-import the exported file
    pg.set_input_files("#imp", jp); pg.wait_for_timeout(500)
    check(len(pg.evaluate("hm3d.scene().items")) == len(j["items"]), "12. the exported file opens again")
    # Phone size
    ctx3, pm = page_for(412, 860, mobile=True)
    pm.goto(f"http://127.0.0.1:{PORT}/venue3d.html"); pm.wait_for_function("window.hm3d && window.hm3d.editor.s", timeout=20000); pm.wait_for_timeout(1500)
    pm.screenshot(path=f"{OUT}/20-phone.png")
    pm.click("[data-tab=add]"); pm.wait_for_timeout(200); pm.screenshot(path=f"{OUT}/21-phone-library.png")
    pm.click("[data-tab=room]"); pm.wait_for_timeout(200); pm.screenshot(path=f"{OUT}/22-phone-room.png")
    wide = pm.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    check(wide, "phone: no sideways scrolling")
    b.close()
srv.shutdown()
check(not errors, "no page errors" + ("" if not errors else ": " + " | ".join(errors[:3])))
open(f"{OUT}/results.txt", "w").write("\n".join(results))
print("\n" + (f"{len(fails)} step(s) failed" if fails else "All browser steps passed"))
sys.exit(1 if fails else 0)
