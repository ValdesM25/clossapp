import Link from "next/link"
import type { Metadata } from "next"
import { LEGAL_CONTACTO, LEGAL_VIGENCIA } from "@/constants/legal"

export const metadata: Metadata = {
  title: "Políticas y Términos · Clossapp",
  description:
    "Aviso de privacidad, términos de uso, reglas del marketplace y planes de Clossapp.",
}

const secciones = [
  { id: "privacidad", label: "Aviso de Privacidad" },
  { id: "terminos", label: "Términos de Uso" },
  { id: "marketplace", label: "Marketplace" },
  { id: "planes", label: "Planes" },
  { id: "contacto", label: "Contacto" },
]

/** Dato legal que sólo puede llenarse cuando la sociedad esté constituida. */
function Pendiente({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-zinc-100 text-zinc-500 border border-dashed border-zinc-300 px-1.5 py-0.5 text-[13px]">
      {children}
    </mark>
  )
}

function Seccion({ id, numero, titulo, children }: {
  id: string; numero: string; titulo: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 flex flex-col gap-4">
      <div className="border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">{numero}</p>
        <h2 className="font-serif text-xl text-zinc-900 mt-0.5">{titulo}</h2>
      </div>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  )
}

function Sub({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-zinc-900 tracking-wide">{titulo}</h3>
      {children}
    </div>
  )
}

export default function PoliticasPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors w-fit">
            ← Volver a Clossapp
          </Link>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Legal</p>
            <h1 className="font-serif text-3xl text-zinc-900 mt-1">Políticas y Términos</h1>
          </div>
          <p className="text-[15px] leading-relaxed text-zinc-600">
            Este documento explica qué información recabamos, para qué la usamos, con quién
            la compartimos y bajo qué reglas funciona Clossapp. Está redactado para leerse,
            no para esconder nada.
          </p>
          <p className="text-xs text-zinc-400">Última actualización: {LEGAL_VIGENCIA}</p>
        </header>

        <nav className="border border-zinc-200 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Contenido</p>
          {secciones.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              {String(i + 1).padStart(2, "0")} · {s.label}
            </a>
          ))}
        </nav>

        <Seccion id="privacidad" numero="01" titulo="Aviso de Privacidad">
          <p>
            En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión
            de los Particulares (LFPDPPP) y su Reglamento, ponemos a tu disposición el
            presente aviso.
          </p>

          <Sub titulo="Responsable del tratamiento">
            <p>
              El responsable de tus datos personales es{" "}
              <Pendiente>[razón social pendiente de constitución]</Pendiente>, con domicilio en{" "}
              <Pendiente>[domicilio fiscal]</Pendiente>, Saltillo, Coahuila de Zaragoza, México, y
              RFC <Pendiente>[RFC]</Pendiente>. Puedes contactarnos en{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">
                {LEGAL_CONTACTO}
              </a>.
            </p>
          </Sub>

          <Sub titulo="Datos que recabamos">
            <p>Recabamos únicamente lo necesario para operar la aplicación:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="font-medium text-zinc-900">Identificación y contacto:</strong> nombre de usuario y correo electrónico.</li>
              <li><strong className="font-medium text-zinc-900">Fotografías de tus prendas:</strong> las imágenes que subes a tu armario digital.</li>
              <li><strong className="font-medium text-zinc-900">Atributos de prenda:</strong> categoría, color, estilo, talla, estado de uso, precio y descripción — generados por análisis automatizado o capturados por ti.</li>
              <li><strong className="font-medium text-zinc-900">Actividad dentro de la app:</strong> frecuencia de uso de prendas, registros de reparación y publicaciones en el marketplace.</li>
              <li><strong className="font-medium text-zinc-900">Datos técnicos:</strong> métricas anónimas de navegación y rendimiento.</li>
            </ul>
            <p className="text-[13px] text-zinc-500 border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              No solicitamos datos personales sensibles, ni datos financieros o bancarios.
              Clossapp no procesa pagos.
            </p>
          </Sub>

          <Sub titulo="Finalidades del tratamiento">
            <p><strong className="font-medium text-zinc-900">Primarias</strong>, necesarias para prestarte el servicio: crear y autenticar tu cuenta; almacenar y organizar tu armario digital; generar recomendaciones de outfits; habilitar la publicación de prendas en venta, renta o donación; y darte soporte.</p>
            <p><strong className="font-medium text-zinc-900">Secundarias</strong>, que puedes rechazar sin que se te niegue el servicio: mejorar la aplicación mediante análisis estadístico agregado, y enviarte comunicaciones sobre novedades del producto.</p>
            <p>Si no deseas que tus datos se usen para las finalidades secundarias, escríbenos a{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">{LEGAL_CONTACTO}</a>{" "}
              en cualquier momento.
            </p>
          </Sub>

          <Sub titulo="Transferencias y encargados">
            <p>
              Para operar, compartimos determinada información con proveedores que actúan
              como encargados del tratamiento. Ninguno de ellos comercializa tus datos.
            </p>
            <div className="border border-zinc-200">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Anthropic PBC (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Cuando usas el análisis automático de prendas o el generador de outfits,{" "}
                  <strong className="font-medium text-zinc-900">
                    las fotografías de tus prendas y el inventario de tu armario se transmiten
                    a los servidores de Anthropic
                  </strong>{" "}
                  para ser procesados por sus modelos de inteligencia artificial (Claude). Este
                  procesamiento es indispensable para dichas funciones: si no aceptas esta
                  transferencia, puedes seguir usando Clossapp capturando tus prendas de forma manual.
                </p>
              </div>
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Supabase Inc. (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Provee la base de datos, el almacenamiento de tus fotografías y el sistema de
                  autenticación.
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Vercel Inc. (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Aloja la aplicación y provee métricas agregadas de uso y rendimiento.
                </p>
              </div>
            </div>
            <p className="text-[14px]">
              Estas transferencias implican que tus datos se procesan fuera de México. Al usar
              Clossapp consientes dicha transferencia internacional en términos del artículo 37
              de la LFPDPPP.
            </p>
          </Sub>

          <Sub titulo="Conservación de datos">
            <p>
              Conservamos tu información mientras tu cuenta esté activa. Si solicitas la
              eliminación de tu cuenta, tus datos personales y fotografías se eliminan de
              nuestros sistemas productivos en un plazo de entre tres y seis meses, salvo
              aquello que debamos conservar por obligación legal. Los respaldos que contengan
              tu información se sobrescriben dentro de ese mismo periodo.
            </p>
          </Sub>

          <Sub titulo="Derechos ARCO">
            <p>
              Tienes derecho a <strong className="font-medium text-zinc-900">acceder</strong> a tus
              datos, <strong className="font-medium text-zinc-900">rectificarlos</strong> cuando sean
              inexactos, <strong className="font-medium text-zinc-900">cancelarlos</strong> cuando
              consideres que no se requieren, y{" "}
              <strong className="font-medium text-zinc-900">oponerte</strong> a su uso para fines
              específicos. También puedes revocar el consentimiento que nos otorgaste.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, envía tu solicitud a{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">{LEGAL_CONTACTO}</a>{" "}
              indicando tu nombre de usuario, el derecho que deseas ejercer y un medio de
              contacto. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </Sub>

          <Sub titulo="Cookies y tecnologías de rastreo">
            <p>
              Usamos almacenamiento local del navegador para mantener tu sesión iniciada, y
              analítica agregada que no te identifica individualmente. No utilizamos cookies
              publicitarias de terceros.
            </p>
          </Sub>

          <Sub titulo="Cambios a este aviso">
            <p>
              Podemos actualizar este aviso conforme evolucione la aplicación o la normativa
              aplicable. Publicaremos la versión vigente en esta misma página, indicando la
              fecha de última actualización. Los cambios sustanciales se te notificarán por
              correo electrónico.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="terminos" numero="02" titulo="Términos de Uso">
          <Sub titulo="Acceso a la plataforma">
            <p>
              Clossapp se encuentra en fase de desarrollo y prueba. El registro es{" "}
              <strong className="font-medium text-zinc-900">por invitación</strong>: sólo pueden
              crear cuenta las personas previamente autorizadas. Más adelante habilitaremos el
              alta abierta mediante correo electrónico y proveedores de identidad como Google y
              Facebook.
            </p>
            <p>
              Existe además un modo invitado con datos de demostración, que no requiere cuenta y
              no almacena información personal.
            </p>
          </Sub>

          <Sub titulo="Tu cuenta">
            <p>
              Debes ser mayor de edad para usar Clossapp. Eres responsable de la veracidad de la
              información que registras y de mantener la confidencialidad de tus credenciales.
              Notifícanos de inmediato si detectas un uso no autorizado de tu cuenta.
            </p>
          </Sub>

          <Sub titulo="Contenido que subes">
            <p>
              Conservas la titularidad de las fotografías y textos que publicas. Al subirlos, nos
              otorgas una licencia limitada, no exclusiva y revocable para almacenarlos,
              procesarlos y mostrarlos dentro de la aplicación con el único fin de prestarte el
              servicio. Esta licencia termina cuando eliminas el contenido o tu cuenta.
            </p>
            <p>
              Te comprometes a subir únicamente fotografías sobre las que tengas derechos, y a no
              publicar imágenes de terceros sin su consentimiento.
            </p>
          </Sub>

          <Sub titulo="Sobre los resultados de inteligencia artificial">
            <p>
              Las categorías, descripciones, estimaciones de precio y sugerencias de outfit que
              genera Clossapp son producidas por modelos automatizados y tienen carácter{" "}
              <strong className="font-medium text-zinc-900">orientativo</strong>. Pueden contener
              errores o imprecisiones. Cualquier precio sugerido es una referencia editable: la
              decisión final sobre el precio de publicación es siempre tuya, y no constituye un
              avalúo ni una garantía de valor de mercado.
            </p>
          </Sub>

          <Sub titulo="Uso aceptable">
            <p>
              No está permitido usar Clossapp para publicar contenido ilícito, ofensivo o que
              infrinja derechos de terceros; intentar acceder a cuentas o datos ajenos; extraer
              información de forma automatizada; ni interferir con el funcionamiento del servicio.
              Podemos suspender cuentas que incumplan estas reglas.
            </p>
          </Sub>

          <Sub titulo="Disponibilidad y limitación de responsabilidad">
            <p>
              El servicio se ofrece “tal cual”, sin garantía de disponibilidad ininterrumpida. Al
              tratarse de una plataforma en fase de prueba, pueden ocurrir interrupciones,
              cambios de funcionalidad o pérdida de datos. Te recomendamos conservar copia de las
              fotografías que consideres importantes.
            </p>
          </Sub>

          <Sub titulo="Legislación aplicable">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
              controversia se someterá a los tribunales competentes de{" "}
              <Pendiente>[ciudad]</Pendiente>, Coahuila de Zaragoza, renunciando a cualquier otro
              fuero. En materia de protección al consumidor, la PROFECO es competente.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="marketplace" numero="03" titulo="Uso del Marketplace">
          <Sub titulo="Nuestro rol">
            <p>
              Clossapp es un{" "}
              <strong className="font-medium text-zinc-900">espacio de encuentro</strong> entre
              personas que desean vender, rentar o donar prendas. No somos parte de la operación:
              no compramos, no vendemos y no somos propietarios de las prendas publicadas.
            </p>
            <p className="text-[13px] text-zinc-500 border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              Clossapp no procesa pagos ni retiene fondos. El pago, la entrega y cualquier
              acuerdo sobre la prenda ocurren directamente entre las personas involucradas y bajo
              su propia responsabilidad.
            </p>
          </Sub>

          <Sub titulo="Responsabilidad de quien publica">
            <p>
              Si publicas una prenda, declaras que es de tu propiedad, que puedes disponer de
              ella legalmente y que la descripción, las fotografías y el estado declarado
              corresponden a la realidad. Los defectos relevantes deben señalarse de forma
              visible.
            </p>
          </Sub>

          <Sub titulo="Responsabilidad de quien aparta">
            <p>
              Al apartar una prenda manifiestas tu intención de adquirirla o rentarla. Te
              corresponde verificar el estado real del artículo antes de concretar cualquier
              pago o intercambio.
            </p>
          </Sub>

          <Sub titulo="Renta">
            <p>
              Sólo determinadas categorías, como vestidos y accesorios, están habilitadas para
              renta. Quien renta se compromete a devolver la prenda en la fecha acordada y en
              condiciones equivalentes a las recibidas, salvo el desgaste normal de uso. Los
              acuerdos sobre depósitos, daños o retrasos son entre las partes.
            </p>
          </Sub>

          <Sub titulo="Donaciones">
            <p>
              El módulo de donaciones permite ofrecer prendas sin fines de lucro. No se cobra
              comisión ni contraprestación alguna por este uso. Las prendas donadas deben estar
              en condiciones dignas de uso.
            </p>
          </Sub>

          <Sub titulo="Prohibiciones">
            <p>
              No pueden publicarse artículos falsificados o que infrinjan marcas registradas,
              productos robados o de procedencia ilícita, ropa interior usada, ni artículos cuya
              comercialización esté restringida por la ley. Tampoco está permitido usar el
              marketplace para operaciones ajenas al intercambio de prendas.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="planes" numero="04" titulo="Planes">
          <div className="border border-zinc-200">
            <div className="border-b border-zinc-200 px-4 py-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Invitado</p>
              <p className="font-serif text-lg text-zinc-900 mt-0.5">Sin costo</p>
              <p className="text-[14px] mt-2">
                Acceso de demostración con datos de ejemplo. Permite recorrer la aplicación sin
                crear cuenta. No guarda información ni habilita las funciones de inteligencia
                artificial.
              </p>
            </div>
            <div className="border-b border-zinc-200 px-4 py-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Registrado</p>
              <p className="font-serif text-lg text-zinc-900 mt-0.5">Sin costo durante la fase de prueba</p>
              <p className="text-[14px] mt-2">
                Armario digital completo, análisis automático de prendas, generación de outfits,
                estadísticas de uso y acceso al marketplace para vender, rentar y donar.
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Premium</p>
              <p className="font-serif text-lg text-zinc-900 mt-0.5">
                <Pendiente>[precio por definir]</Pendiente>
              </p>
              <p className="text-[14px] mt-2">
                Plan de pago previsto para etapas posteriores. Sus funciones, límites y precio se
                publicarán en esta página antes de su activación. Ninguna cuenta será cobrada sin
                aviso ni consentimiento previo.
              </p>
            </div>
          </div>
          <p className="text-[14px]">
            Durante la fase de prueba no se realiza cobro alguno. Si en el futuro incorporamos
            planes de pago, los cambios se comunicarán con anticipación y podrás cancelar en
            cualquier momento.
          </p>
        </Seccion>

        <Seccion id="contacto" numero="05" titulo="Contacto">
          <p>
            Para dudas sobre estas políticas, solicitudes de derechos ARCO, reportes de contenido
            o soporte general, escríbenos a{" "}
            <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">
              {LEGAL_CONTACTO}
            </a>.
          </p>
          <p className="text-[14px]">
            Atendemos solicitudes en días hábiles. Para temas de privacidad, el plazo máximo de
            respuesta es de 20 días hábiles conforme a la LFPDPPP.
          </p>
        </Seccion>

        <footer className="border-t border-zinc-200 pt-6 flex flex-col gap-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Clossapp es un proyecto en fase de desarrollo. Los datos legales marcados en gris se
            completarán una vez constituida formalmente la sociedad.
          </p>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors w-fit">
            ← Volver a Clossapp
          </Link>
        </footer>
      </div>
    </main>
  )
}
