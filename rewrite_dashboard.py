import re
import os

filepath = 'frontend/src/components/layout/DashboardLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports_to_add = """import { useRoleBasedMenu } from "../../hooks/useRoleBasedMenu";
import { ChevronDown, ChevronRight } from "lucide-react";
"""
content = content.replace('import { useRoleBasedRedirect } from "../../hooks/useRoleBasedRedirect";', 
                          'import { useRoleBasedRedirect } from "../../hooks/useRoleBasedRedirect";\n' + imports_to_add)

# Remove NavItem interface
content = re.sub(r'interface NavItem \{[\s\S]*?\}', '', content)

# Replace navigation array definition
# Find the exact boundaries. The array ends at line 615, which is `  ];` followed by `  const handleLogout = () => {`
nav_pattern2 = r'const navigation: NavItem\[\] = \[[\s\S]*?\];(?=\s*const handleLogout)'

content = re.sub(nav_pattern2, '', content)

# Inside DashboardLayout component, add state for expanded menus
state_to_add = """  const navigation = useRoleBasedMenu();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    recruitment: true,
    clients_group: true,
    hiring: true,
    activities: true,
    reporting: true,
    settings: true
  });

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };"""

content = content.replace('useRoleBasedRedirect();', 'useRoleBasedRedirect();\n\n' + state_to_add)

# Now replace the rendering logic
# find `<nav className="mt-5 px-2">` block
nav_render_pattern = r'<nav className="mt-5 px-2">[\s\S]*?</nav>'

new_nav_render = """<nav className="mt-5 px-2 pb-20">
          <div className="space-y-1">
            {navigation.map((item) => (
              <div key={item.id}>
                {item.children && item.children.length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className="w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500">
                          {item.icon && <item.icon className="h-5 w-5" />}
                        </div>
                        {item.label}
                      </div>
                      {expandedMenus[item.id] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {expandedMenus[item.id] && (
                      <div className="mt-1 space-y-1 pl-10">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              if (child.path) {
                                navigate(child.path);
                                setSidebarOpen(false);
                              }
                            }}
                            className={`
                              group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors
                              ${isActive(child.path || '')
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }
                            `}
                          >
                            <div className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive(child.path || '') ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}`}>
                                {child.icon && <child.icon className="h-4 w-4" />}
                            </div>
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (item.path) {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors
                      ${isActive(item.path || '')
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    <div
                      className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive(item.path || '') ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                    </div>
                    {item.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </nav>"""

content = re.sub(nav_render_pattern, new_nav_render, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
