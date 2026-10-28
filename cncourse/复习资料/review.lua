-- Keep color semantics in PDF and HTML, including inline mathematical content.
function Span(span)
  if FORMAT:match('latex') then
    local color = nil
    if span.classes:includes('key') then color = 'examred' end
    if span.classes:includes('hard') then color = 'exampurple' end
    if color then
      local content = pandoc.List({pandoc.RawInline('latex', '{\\color{' .. color .. '}')})
      content:extend(span.content)
      content:insert(pandoc.RawInline('latex', '}'))
      return content
    end
  end
end

function CodeBlock(block)
  if FORMAT:match('latex') then
    return {
      pandoc.RawBlock('latex', '\\par\\noindent\\begin{minipage}{\\linewidth}'),
      block,
      pandoc.RawBlock('latex', '\\end{minipage}\\par')
    }
  end
end

function Header(header)
  if FORMAT:match('latex') and header.level == 1 then
    return {pandoc.RawBlock('latex', '\\clearpage'), header}
  end
end

function Para(para)
  if FORMAT:match('latex') then
    local text = pandoc.utils.stringify(para)
    if text:match('^填空 F%d%d') or text:match('^简答 S%d%d') or text:match('^例题 E%d%d') then
      return {pandoc.RawBlock('latex', '\\Needspace{6\\baselineskip}'), para,
              pandoc.RawBlock('latex', '\\nopagebreak[4]')}
    end
    if text == '参考答案与过程：' then
      return {pandoc.RawBlock('latex', '\\Needspace{4\\baselineskip}'), para,
              pandoc.RawBlock('latex', '\\nopagebreak[4]')}
    end
  end
end

function Table(tbl)
  if FORMAT:match('html') then
    return pandoc.Div({tbl}, pandoc.Attr('', {'table-scroll'}))
  end
  if not FORMAT:match('latex') then return end
  local widths = nil
  local labels = {}
  for _, row in ipairs(tbl.head.rows) do
    for _, cell in ipairs(row.cells) do
      labels[#labels + 1] = pandoc.utils.stringify(cell.contents)
    end
  end
  local heading = table.concat(labels, ' ')
  local count = #tbl.colspecs
  if heading:match('课件文件') then widths = {.10, .80, .10}
  elseif heading:match('字段') and count == 3 then widths = {.23, .10, .67}
  elseif count == 2 then widths = {.27, .73}
  elseif count == 3 then widths = {.20, .31, .49}
  elseif count == 4 then widths = {.18, .25, .28, .29}
  elseif count == 5 then widths = {.13, .32, .19, .18, .18}
  elseif count == 6 then widths = {.09, .27, .17, .18, .16, .13} end
  if widths then
    for i, col in ipairs(tbl.colspecs) do col[2] = widths[i] end
    return tbl
  end
end

function Math(math)
  if FORMAT:match('html') and math.mathtype == 'DisplayMath' then
    return {pandoc.RawInline('html', '<span class="formula-scroll">'), math,
            pandoc.RawInline('html', '</span>')}
  end
end
