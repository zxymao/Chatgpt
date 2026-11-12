#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
import fitz
ROOT=Path(__file__).resolve().parent
PDF=ROOT/'Project2-关键步骤与逐句讲解.pdf'


def main():
    doc=fitz.open(PDF)
    headings=json.loads((ROOT/'outline-headings.json').read_text())
    old=doc.get_toc()
    assert len(old)==len(headings),(len(old),len(headings))
    doc.set_toc([[item[0],heading['title'],item[2]] for item,heading in zip(old,headings)])
    meta=doc.metadata;meta['title']='Project 2：关键步骤与逐句讲解';meta['subject']='Task1—4：完整代码、逐句解释、状态推演与实际验证';doc.set_metadata(meta)
    temp=PDF.with_suffix('.normalized.pdf');doc.save(temp,garbage=0);doc.close();temp.replace(PDF)
    doc=fitz.open(PDF);text='\n'.join(page.get_text() for page in doc)
    assert '\ufffd' not in text and '\x00' not in text,'Missing/replacement glyph in extracted PDF'
    empty=[i+1 for i,page in enumerate(doc) if len(page.get_text().strip())<65]
    assert not empty,empty
    overflow=[]
    for i,page in enumerate(doc):
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                for span in line.get('spans',[]):
                    x0,y0,x1,y1=span['bbox']
                    if x0 < -1 or y0 < -1 or x1>page.rect.width+1 or y1>page.rect.height+1:overflow.append([i+1,span['text']])
    assert not overflow,overflow[:5]
    required=['switch_to','SAVE_CONTEXT','RESTORE_CONTEXT','sys_yield','do_block','wakeup_time','TIMER_INTERVAL','EFAULT','ENOSYS']
    assert all(word in text for word in required)
    assert doc.get_toc()[1][1]=='阅读路线与目录'
    result={'pages':len(doc),'bytes':PDF.stat().st_size,'sha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'bookmarks':len(doc.get_toc()),'unexpected_near_empty_pages':empty,'out_of_page_text_spans':overflow,'selectable_chinese_and_code':True,'replacement_or_nul_characters':0,'outline_titles_normalized':True}
    (ROOT/'pdf-quality.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
